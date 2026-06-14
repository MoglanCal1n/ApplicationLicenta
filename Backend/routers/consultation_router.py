from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from db.database import get_db
from models.user import User, UserRole, DoctorProfile, PatientProfile
from models.consultation import Consultation, ConsultationStatus, Appointment, AppointmentStatus
from core.security import get_current_user
from services.audio_service import process_hybrid_transcription
from services.pdf_service import generate_consultation_pdf, generate_structured_pdf
from services.llm_service import extract_structured_fields, edit_transcript_with_llm, extract_medical_entities
from schemas.consultation_schema import ConsultationFinalize, ConsultationFinalizeStructured, ExtractTextRequest
import shutil
import os
import uuid
import logging
from datetime import datetime
from routers.notification_router import create_and_push_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/consultations", tags=["Consultations"])

UPLOAD_DIR = "uploads/audio"
TEMP_DIR   = "uploads/temp"


def _ensure_dirs():
    """Ensure upload and temp directories exist."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(TEMP_DIR, exist_ok=True)


def _get_doctor_or_403(current_user: User, db: Session) -> DoctorProfile:
    """Validates the user is a doctor and returns their profile."""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can perform this action.")
    doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")
    return doctor


def _get_patient_or_404(patient_id: int, db: Session) -> PatientProfile:
    """Validates a patient exists and returns their profile."""
    patient = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return patient


def _run_ai_pipeline(result: dict) -> tuple[str, str, dict]:
    """
    Runs the AI post-processing pipeline on transcription results.

    Pipeline:
        1. Take plain text (text_simple) — no HTML contamination
        2. Edit/proofread with Ollama (temperature=0)
        3. Extract structured fields with Ollama (temperature=0)

    Returns: (plain_transcript, edited_text, structured_fields)
    """
    transcript_text = result.get("text_simple", "")

    # Step 1: Proofread the plain transcript
    edited_text = (
        edit_transcript_with_llm(transcript_text)
        if transcript_text.strip()
        else transcript_text
    )

    # Step 2: Extract structured medical fields from the edited text
    structured = (
        extract_structured_fields(edited_text)
        if edited_text.strip()
        else {"symptoms": "", "diagnosis": "", "recommendations": "", "prescriptions": ""}
    )

    return transcript_text, edited_text, structured


def _build_metadata(result: dict, edited_text: str, structured: dict) -> dict:
    """Builds the mixed_score_metadata JSON blob."""
    return {
        "text_format_html": (
            edited_text.replace('\n', '<br>') if edited_text
            else result.get("text_format_html", "")
        ),
        "corection_total":   result.get("corection_total", 0),
        "corection_log":     result.get("corection_log", []),
        "structured_fields": structured,
    }


def _upsert_consultation(
    db: Session,
    appointment_id: int | None,
    patient: PatientProfile,
    doctor: DoctorProfile,
    audio_filename: str,
    transcript_text: str,
    meta: dict,
    acting_user_id: int | None = None,
) -> Consultation:
    """Creates or updates a draft consultation record."""
    existing = None
    if appointment_id:
        existing = db.query(Consultation).filter(
            Consultation.appointment_id == appointment_id,
            Consultation.status == ConsultationStatus.DRAFT,
            Consultation.is_deleted == False
        ).first()

    if existing:
        existing.consult_audio_url    = f"/static/audio/{audio_filename}"
        existing.ai_draft_transcript  = transcript_text
        existing.mixed_score_metadata = meta
        existing.updated_by = acting_user_id
        db.commit()
        db.refresh(existing)
        return existing
    else:
        consultation = Consultation(
            appointment_id=appointment_id,
            patient_id=patient.id,
            doctor_id=doctor.id,
            consult_audio_url=f"/static/audio/{audio_filename}",
            ai_draft_transcript=transcript_text,
            mixed_score_metadata=meta,
            status=ConsultationStatus.DRAFT,
            created_by=acting_user_id,
            updated_by=acting_user_id,
        )
        db.add(consultation)
        db.commit()
        db.refresh(consultation)
        return consultation


# ─── Audio upload (file-based, no live recording required) ──────────────────
@router.post("/upload-audio")
async def upload_audio_consultation(
    patient_id: int = Form(...),
    appointment_id: int = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a pre-recorded audio file and transcribe it (same pipeline as live recording)."""
    doctor  = _get_doctor_or_403(current_user, db)
    patient = _get_patient_or_404(patient_id, db)
    _ensure_dirs()

    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    temp_file_path  = os.path.join(TEMP_DIR, f"temp_{unique_filename}")
    final_file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result = process_hybrid_transcription(temp_file_path)
    finally:
        if os.path.exists(temp_file_path):
            shutil.move(temp_file_path, final_file_path)

    # ── AI pipeline: plain text → edit → extract ──
    transcript_text, edited_text, structured = _run_ai_pipeline(result)
    meta = _build_metadata(result, edited_text, structured)

    consultation = _upsert_consultation(
        db, appointment_id, patient, doctor,
        unique_filename, transcript_text, meta,
        acting_user_id=current_user.id,
    )

    return {
        "message":           "Audio uploaded and consultation saved.",
        "consultation_id":   consultation.id,
        "patient_user_id":   patient.user_id,
        "result":            result,
        "structured_fields": structured,
    }


# ─── Transcribe (live recording) ─────────────────────────────────────────────
@router.post("/transcribe")
async def transcribe_consultation(
    patient_id: int = Form(...),
    appointment_id: int = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Transcribe a live recording from the browser microphone."""
    doctor  = _get_doctor_or_403(current_user, db)
    patient = _get_patient_or_404(patient_id, db)
    _ensure_dirs()

    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    temp_file_path  = os.path.join(TEMP_DIR, f"temp_{unique_filename}")
    final_file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result = process_hybrid_transcription(temp_file_path)
    finally:
        if os.path.exists(temp_file_path):
            shutil.move(temp_file_path, final_file_path)

    # ── AI pipeline: plain text → edit → extract ──
    # (Previously this used text_format_html — now fixed to use text_simple)
    transcript_text, edited_text, structured = _run_ai_pipeline(result)
    meta = _build_metadata(result, edited_text, structured)

    consultation = _upsert_consultation(
        db, appointment_id, patient, doctor,
        unique_filename, transcript_text, meta,
        acting_user_id=current_user.id,
    )

    return {
        "message":           "Consultation saved successfully.",
        "consultation_id":   consultation.id,
        "patient_user_id":   patient.user_id,
        "result":            result,
        "structured_fields": structured,
    }


# ─── History endpoints (must come BEFORE /{consultation_id}) ─────────────────
@router.get("/history")
def get_consultation_history(
    skip: int = 0,
    limit: int = 100,
    status: ConsultationStatus = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Consultation).filter(Consultation.is_deleted == False)

    if current_user.role == UserRole.PATIENT:
        patient = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient profile not found.")
        query = query.filter(Consultation.patient_id == patient.id)

    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor profile not found.")
        query = query.filter(Consultation.doctor_id == doctor.id)

    else:
        raise HTTPException(status_code=403, detail="Use /admin/consultations for admin access.")

    if status:
        query = query.filter(Consultation.status == status)

    return query.order_by(Consultation.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/my-history")
def get_my_consultation_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns enriched consultation history for the current patient."""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can view their history this way.")

    patient = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    consultations = db.query(Consultation)\
        .filter(Consultation.patient_id == patient.id)\
        .order_by(Consultation.created_at.desc()).all()

    # Pre-fetch all doctor profiles and users in bulk to avoid N+1 queries
    doctor_ids = {c.doctor_id for c in consultations}
    doctor_profiles = {
        dp.id: dp
        for dp in db.query(DoctorProfile).filter(DoctorProfile.id.in_(doctor_ids)).all()
    }
    doctor_user_ids = {dp.user_id for dp in doctor_profiles.values()}
    doctor_users = {
        u.id: u
        for u in db.query(User).filter(User.id.in_(doctor_user_ids)).all()
    }

    result = []
    for c in consultations:
        doctor_profile = doctor_profiles.get(c.doctor_id)
        doctor_user = doctor_users.get(doctor_profile.user_id) if doctor_profile else None

        if doctor_user:
            first = (doctor_user.first_name or "").strip()
            last  = (doctor_user.last_name  or "").strip()
            doctor_display = f"{first} {last}".strip() or doctor_user.email.split("@")[0]
        else:
            doctor_display = "Necunoscut"

        result.append({
            "id": c.id,
            "status": c.status,
            "created_at": c.created_at,
            "signed_at": c.signed_at,
            "ai_draft_transcript": c.ai_draft_transcript,
            "final_revised_text": c.final_revised_text,
            "pdf_report_url": c.pdf_report_url,
            "doctor_name": doctor_display,
            "doctor_specialization": doctor_profile.specialization if doctor_profile else "Necunoscut",
            # E2EE fields for client-side decryption
            "doctor_user_id": doctor_profile.user_id if doctor_profile else None,
            "encrypted_final_text": c.encrypted_final_text,
            "encrypted_structured": c.encrypted_structured,
            "e2ee_iv_b64": c.e2ee_iv_b64,
            "e2ee_salt_b64": c.e2ee_salt_b64,
            "e2ee_sender_user_id": c.e2ee_sender_user_id,
        })
    return result


@router.get("/doctor-history")
def get_doctor_consultation_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns enriched consultation history for the current doctor."""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can view their history this way.")

    doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    consultations = db.query(Consultation)\
        .filter(Consultation.doctor_id == doctor.id)\
        .order_by(Consultation.created_at.desc()).all()

    # Pre-fetch all patient profiles and users in bulk to avoid N+1 queries
    patient_ids = {c.patient_id for c in consultations}
    patient_profiles = {
        pp.id: pp
        for pp in db.query(PatientProfile).filter(PatientProfile.id.in_(patient_ids)).all()
    }
    patient_user_ids = {pp.user_id for pp in patient_profiles.values()}
    patient_users = {
        u.id: u
        for u in db.query(User).filter(User.id.in_(patient_user_ids)).all()
    }

    result = []
    for c in consultations:
        patient_profile = patient_profiles.get(c.patient_id)
        patient_user = patient_users.get(patient_profile.user_id) if patient_profile else None
        meta = c.mixed_score_metadata or {}
        result.append({
            "id": c.id,
            "status": c.status,
            "created_at": c.created_at,
            "signed_at": c.signed_at,
            "ai_draft_transcript": c.ai_draft_transcript,
            "final_revised_text": c.final_revised_text,
            "pdf_report_url": c.pdf_report_url,
            "text_format_html": meta.get("text_format_html", c.ai_draft_transcript or ""),
            "patient_email": patient_user.email if patient_user else "Unknown",
            "patient_cnp": patient_profile.cnp if patient_profile else "N/A",
            # E2EE fields for client-side decryption
            "patient_user_id": patient_profile.user_id if patient_profile else None,
            "encrypted_final_text": c.encrypted_final_text,
            "encrypted_structured": c.encrypted_structured,
            "e2ee_iv_b64": c.e2ee_iv_b64,
            "e2ee_salt_b64": c.e2ee_salt_b64,
            "e2ee_sender_user_id": c.e2ee_sender_user_id,
            "mixed_score_metadata": c.mixed_score_metadata,
        })
    return result


# ─── Extract fields from arbitrary text ───────────────────────────────────────
@router.post("/extract-from-text")
def extract_from_text(
    request: ExtractTextRequest,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can extract entities.")
    
    if not request.text.strip():
        return {
            "symptoms": "",
            "diagnosis": "",
            "recommendations": "",
            "prescriptions": ""
        }

    structured = extract_structured_fields(request.text)
    return structured


# ─── Single consultation by ID (must come AFTER named sub-paths) ──────────────
@router.get("/{consultation_id}")
def get_consultation_by_id(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id,
        Consultation.is_deleted == False
    ).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    # Admins can view any consultation
    if current_user.role == UserRole.ADMIN:
        return consultation

    if current_user.role == UserRole.PATIENT:
        patient = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        if not patient or consultation.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this consultation.")
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
        if not doctor or consultation.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this consultation.")

    return consultation


# ─── Finalize (structured PDF template) ──────────────────────────────────────
@router.post("/{consultation_id}/finalize")
async def finalize_consultation(
    consultation_id: int,
    data: ConsultationFinalizeStructured,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can finalize consultations.")

    doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()

    if not consultation or consultation.doctor_id != doctor.id:
        raise HTTPException(status_code=404, detail="Consultation not found or access denied.")

    if consultation.status == ConsultationStatus.SIGNED:
        raise HTTPException(status_code=400, detail="Consultation is already finalized and signed.")

    patient = db.query(PatientProfile).filter(PatientProfile.id == consultation.patient_id).first()
    patient_user = db.query(User).filter(User.id == patient.user_id).first() if patient else None
    doctor_user = db.query(User).filter(User.id == doctor.user_id).first()

    # Persist the structured data and free-text temporarily for PDF generation
    consultation.final_revised_text = data.final_revised_text
    consultation.status = ConsultationStatus.SIGNED
    consultation.signed_at = datetime.now()

    # Store structured fields in metadata so they can be used for re-generation
    meta = dict(consultation.mixed_score_metadata or {})
    meta["structured_fields"] = {
        "symptoms": data.symptoms,
        "diagnosis": data.diagnosis,
        "recommendations": data.recommendations,
        "prescriptions": data.prescriptions,
    }
    consultation.mixed_score_metadata = meta

    # Generate structured PDF (from plaintext — before we clear it)
    pdf_filename = generate_structured_pdf(
        consultation_id=consultation.id,
        patient_cnp=patient.cnp if patient else "N/A",
        patient_name=f"{patient_user.first_name or ''} {patient_user.last_name or ''}".strip() if patient_user else "N/A",
        doctor_name=f"{doctor_user.first_name or ''} {doctor_user.last_name or ''}".strip() if doctor_user else doctor.license_number,
        doctor_license=doctor.license_number or "N/A",
        doctor_specialization=doctor.specialization or "N/A",
        symptoms=data.symptoms,
        diagnosis=data.diagnosis,
        recommendations=data.recommendations,
        prescriptions=data.prescriptions,
        notes=data.final_revised_text,
        date=consultation.signed_at
    )

    consultation.pdf_report_url = f"/static/pdf/{pdf_filename}"

    # ── E2EE: Store encrypted blobs and clear plaintext ────────────────
    if data.encrypted_final_text and data.e2ee_iv_b64 and data.e2ee_salt_b64:
        consultation.encrypted_final_text = data.encrypted_final_text
        consultation.encrypted_structured = data.encrypted_structured
        consultation.e2ee_iv_b64 = data.e2ee_iv_b64
        consultation.e2ee_salt_b64 = data.e2ee_salt_b64
        consultation.e2ee_sender_user_id = current_user.id

        # Clear plaintext — the server no longer needs it
        consultation.final_revised_text = None
        consultation.ai_draft_transcript = None
        consultation.mixed_score_metadata = None
        logger.info(f"[e2ee] Consultation {consultation.id} finalized with E2EE encryption.")

    # Mark the linked appointment as COMPLETED
    if consultation.appointment_id:
        appointment = db.query(Appointment).filter(Appointment.id == consultation.appointment_id).first()
        if appointment:
            appointment.status = AppointmentStatus.COMPLETED

    db.commit()
    db.refresh(consultation)

    # In-app notification via WebSocket
    doctor_name = f"{doctor_user.first_name or ''} {doctor_user.last_name or ''}".strip() or doctor_user.email
    if patient_user:
        await create_and_push_notification(
            db=db,
            user_id=patient_user.id,
            notification_type="CONSULTATION_FINALIZED",
            title="Consultation Finalized",
            message=f"Dr. {doctor_name} has finalized and signed your consultation report.",
            metadata={"consultation_id": consultation.id},
        )

    return {
        "message": "Consultation finalized and signed successfully.",
        "pdf_url": consultation.pdf_report_url
    }


# ─── Update / re-generate PDF ─────────────────────────────────────────────────
@router.put("/{consultation_id}/update")
async def update_consultation(
    consultation_id: int,
    data: ConsultationFinalizeStructured,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows a doctor to edit a consultation's text/fields and regenerate the PDF."""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can update consultations.")

    doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()

    if not consultation or consultation.doctor_id != doctor.id:
        raise HTTPException(status_code=404, detail="Consultation not found or access denied.")

    patient = db.query(PatientProfile).filter(PatientProfile.id == consultation.patient_id).first()
    patient_user = db.query(User).filter(User.id == patient.user_id).first() if patient else None
    doctor_user = db.query(User).filter(User.id == doctor.user_id).first()

    consultation.final_revised_text = data.final_revised_text
    consultation.status = ConsultationStatus.SIGNED
    consultation.signed_at = datetime.now()

    meta = dict(consultation.mixed_score_metadata or {})
    meta["structured_fields"] = {
        "symptoms": data.symptoms,
        "diagnosis": data.diagnosis,
        "recommendations": data.recommendations,
        "prescriptions": data.prescriptions,
    }
    consultation.mixed_score_metadata = meta

    pdf_filename = generate_structured_pdf(
        consultation_id=consultation.id,
        patient_cnp=patient.cnp if patient else "N/A",
        patient_name=f"{patient_user.first_name or ''} {patient_user.last_name or ''}".strip() if patient_user else "N/A",
        doctor_name=f"{doctor_user.first_name or ''} {doctor_user.last_name or ''}".strip() if doctor_user else doctor.license_number,
        doctor_license=doctor.license_number or "N/A",
        doctor_specialization=doctor.specialization or "N/A",
        symptoms=data.symptoms,
        diagnosis=data.diagnosis,
        recommendations=data.recommendations,
        prescriptions=data.prescriptions,
        notes=data.final_revised_text,
        date=consultation.signed_at
    )
    consultation.pdf_report_url = f"/static/pdf/{pdf_filename}"

    # ── E2EE: Store encrypted blobs and clear plaintext ────────────────
    if data.encrypted_final_text and data.e2ee_iv_b64 and data.e2ee_salt_b64:
        consultation.encrypted_final_text = data.encrypted_final_text
        consultation.encrypted_structured = data.encrypted_structured
        consultation.e2ee_iv_b64 = data.e2ee_iv_b64
        consultation.e2ee_salt_b64 = data.e2ee_salt_b64
        consultation.e2ee_sender_user_id = current_user.id

        consultation.final_revised_text = None
        consultation.ai_draft_transcript = None
        consultation.mixed_score_metadata = None
        logger.info(f"[e2ee] Consultation {consultation.id} updated with E2EE encryption.")

    db.commit()
    db.refresh(consultation)

    # In-app notification via WebSocket on update
    doctor_name = f"{doctor_user.first_name or ''} {doctor_user.last_name or ''}".strip() or doctor_user.email
    if patient_user:
        await create_and_push_notification(
            db=db,
            user_id=patient_user.id,
            notification_type="CONSULTATION_UPDATED",
            title="Consultation Report Updated",
            message=f"Dr. {doctor_name} has updated your consultation report.",
            metadata={"consultation_id": consultation.id},
        )

    return {
        "message": "Consultation updated and PDF regenerated.",
        "pdf_url": consultation.pdf_report_url
    }


# ─── Entity extraction ────────────────────────────────────────────────────────
@router.post("/{consultation_id}/extract-entities")
def extract_entities(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can extract entities.")

    doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()

    if not consultation or consultation.doctor_id != doctor.id:
        raise HTTPException(status_code=404, detail="Consultation not found or access denied.")

    if not consultation.ai_draft_transcript:
        raise HTTPException(status_code=400, detail="No transcript available to analyze.")

    extracted_json = extract_medical_entities(consultation.ai_draft_transcript)

    if consultation.mixed_score_metadata is None:
        consultation.mixed_score_metadata = {}

    meta = dict(consultation.mixed_score_metadata)
    meta["llm_extracted_entities"] = extracted_json
    consultation.mixed_score_metadata = meta

    db.commit()
    db.refresh(consultation)

    return {
        "message": "Entities extracted successfully",
        "entities": extracted_json
    }
