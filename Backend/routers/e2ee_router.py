"""
E2EE Router — End-to-End Encryption key management and encrypted file storage.

The server acts as a BLIND RELAY: it stores ECDH public keys and encrypted blobs
but never possesses the private keys or derived symmetric keys needed for decryption.

Cryptographic flow:
    1. Each user generates an ECDH P-256 key pair client-side (Web Crypto API)
    2. The public key (JWK format) is registered via POST /e2ee/register-key
    3. To encrypt a file for a specific recipient:
       a. Fetch the recipient's public key via GET /e2ee/public-key/{user_id}
       b. Perform ECDH key agreement → shared secret
       c. Derive AES-256-GCM key via HKDF-SHA256 with a random salt
       d. Encrypt the file payload (PDF, audio, metadata)
       e. Upload the encrypted blob + iv + salt via POST /e2ee/upload-encrypted
    4. Recipient downloads the blob and reverses the process client-side
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.database import get_db
from models.user import User, UserRole, DoctorProfile, PatientProfile
from models.consultation import Consultation
from core.security import get_current_user
import os
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/e2ee", tags=["End-to-End Encryption"])

ENCRYPTED_DIR = "uploads/encrypted"


class RegisterKeyRequest(BaseModel):
    """JWK-encoded ECDH public key."""
    public_key_jwk: str   # JSON string of the JWK


class EncryptedUploadMetadata(BaseModel):
    """Metadata for an encrypted file upload."""
    consultation_id: int
    file_type: str       # "pdf", "audio", "metadata"
    iv_b64: str          # Base64-encoded 12-byte IV
    salt_b64: str        # Base64-encoded 16-byte HKDF salt
    sender_user_id: int  # So recipient knows whose public key to use for ECDH


# ── Register public key ───────────────────────────────────────────────────────
@router.post("/register-key")
def register_public_key(
    req: RegisterKeyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Store the user's ECDH public key (JWK format).
    Called once after key generation, or when rotating keys.
    """
    # Validate that it's a parseable JWK
    try:
        jwk = json.loads(req.public_key_jwk)
        if jwk.get("kty") != "EC" or jwk.get("crv") != "P-256":
            raise ValueError("Key must be ECDH P-256")
        if "d" in jwk:
            raise ValueError("NEVER send the private key to the server")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid JWK: {e}")

    current_user.e2ee_public_key = req.public_key_jwk
    db.commit()

    return {"message": "Public key registered successfully."}


# ── Get someone's public key ──────────────────────────────────────────────────
@router.get("/public-key/{user_id}")
def get_public_key(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve a user's ECDH public key.
    Access control: doctors can fetch patient keys and vice versa,
    but only if they share a consultation.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if not target_user.e2ee_public_key:
        raise HTTPException(
            status_code=404,
            detail="User has not registered an E2EE key yet."
        )

    # Authorization: verify the requester has a consultation link to this user
    _verify_consultation_link(current_user, target_user, db)

    return {"user_id": user_id, "public_key_jwk": target_user.e2ee_public_key}


# ── Upload encrypted file ────────────────────────────────────────────────────
@router.post("/upload-encrypted")
async def upload_encrypted_file(
    consultation_id: int = Form(...),
    file_type: str = Form(...),          # "pdf" | "audio" | "metadata"
    iv_b64: str = Form(...),             # Base64-encoded 12-byte IV
    salt_b64: str = Form(...),           # Base64-encoded 16-byte HKDF salt
    sender_user_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload an encrypted blob. The server stores it as-is without decryption.
    """
    # Verify the user owns this consultation
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    _verify_consultation_ownership(current_user, consultation, db)

    # Store the encrypted blob
    consultation_dir = os.path.join(ENCRYPTED_DIR, str(consultation_id))
    os.makedirs(consultation_dir, exist_ok=True)

    blob_filename = f"encrypted_{file_type}_{consultation_id}.bin"
    blob_path = os.path.join(consultation_dir, blob_filename)

    with open(blob_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Store metadata alongside the blob
    meta_filename = f"encrypted_{file_type}_{consultation_id}.meta.json"
    meta_path = os.path.join(consultation_dir, meta_filename)
    with open(meta_path, "w") as f:
        json.dump({
            "consultation_id": consultation_id,
            "file_type": file_type,
            "iv_b64": iv_b64,
            "salt_b64": salt_b64,
            "sender_user_id": sender_user_id,
            "original_filename": file.filename,
            "size_bytes": len(content),
        }, f)

    logger.info(f"[e2ee] Encrypted {file_type} stored for consultation {consultation_id}")

    return {
        "message": "Encrypted file uploaded successfully.",
        "file_type": file_type,
        "blob_path": f"/e2ee/download-encrypted/{consultation_id}/{file_type}",
    }


# ── Download encrypted file ──────────────────────────────────────────────────
@router.get("/download-encrypted/{consultation_id}/{file_type}")
def download_encrypted_file(
    consultation_id: int,
    file_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download an encrypted blob + its encryption metadata.
    The client decrypts it locally using ECDH-derived keys.
    """
    from fastapi.responses import FileResponse

    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    _verify_consultation_ownership(current_user, consultation, db)

    consultation_dir = os.path.join(ENCRYPTED_DIR, str(consultation_id))
    blob_filename = f"encrypted_{file_type}_{consultation_id}.bin"
    meta_filename = f"encrypted_{file_type}_{consultation_id}.meta.json"
    blob_path = os.path.join(consultation_dir, blob_filename)
    meta_path = os.path.join(consultation_dir, meta_filename)

    if not os.path.exists(blob_path) or not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Encrypted file not found.")

    return FileResponse(
        blob_path,
        media_type="application/octet-stream",
        headers={
            "X-E2EE-Meta": open(meta_path).read(),
            "Content-Disposition": f"attachment; filename={blob_filename}",
        }
    )


# ── Fetch encryption metadata only (without downloading the blob) ─────────
@router.get("/meta/{consultation_id}/{file_type}")
def get_encryption_metadata(
    consultation_id: int,
    file_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns encryption metadata (iv, salt, sender) without the blob itself."""
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    _verify_consultation_ownership(current_user, consultation, db)

    meta_path = os.path.join(
        ENCRYPTED_DIR, str(consultation_id),
        f"encrypted_{file_type}_{consultation_id}.meta.json"
    )
    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Encryption metadata not found.")

    with open(meta_path) as f:
        return json.load(f)


# ── Internal helpers ──────────────────────────────────────────────────────────
def _verify_consultation_link(requester: User, target: User, db: Session):
    """
    Verify that requester and target share at least one consultation.
    Prevents arbitrary users from fetching each other's public keys.
    """
    if requester.id == target.id:
        return  # Users can always access their own key

    # Check if they share a consultation in any direction
    requester_profile_id = None
    target_profile_id = None

    if requester.role == UserRole.DOCTOR:
        dp = db.query(DoctorProfile).filter(DoctorProfile.user_id == requester.id).first()
        if dp:
            requester_profile_id = dp.id
    elif requester.role == UserRole.PATIENT:
        pp = db.query(PatientProfile).filter(PatientProfile.user_id == requester.id).first()
        if pp:
            requester_profile_id = pp.id

    if target.role == UserRole.DOCTOR:
        dp = db.query(DoctorProfile).filter(DoctorProfile.user_id == target.id).first()
        if dp:
            target_profile_id = dp.id
    elif target.role == UserRole.PATIENT:
        pp = db.query(PatientProfile).filter(PatientProfile.user_id == target.id).first()
        if pp:
            target_profile_id = pp.id

    if requester_profile_id is None or target_profile_id is None:
        raise HTTPException(status_code=403, detail="No consultation link exists between these users.")

    # Doctor requesting patient's key, or patient requesting doctor's key
    shared = db.query(Consultation).filter(
        (
            (Consultation.doctor_id == requester_profile_id) &
            (Consultation.patient_id == target_profile_id)
        ) | (
            (Consultation.doctor_id == target_profile_id) &
            (Consultation.patient_id == requester_profile_id)
        )
    ).first()

    if not shared:
        raise HTTPException(status_code=403, detail="No consultation link exists between these users.")


def _verify_consultation_ownership(user: User, consultation: Consultation, db: Session):
    """Verify the user is either the doctor or patient on this consultation."""
    if user.role == UserRole.DOCTOR:
        dp = db.query(DoctorProfile).filter(DoctorProfile.user_id == user.id).first()
        if dp and consultation.doctor_id == dp.id:
            return
    elif user.role == UserRole.PATIENT:
        pp = db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()
        if pp and consultation.patient_id == pp.id:
            return

    raise HTTPException(status_code=403, detail="Not authorized to access this consultation's encrypted data.")
