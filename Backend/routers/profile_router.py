from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from db.database import get_db
from models.user import User, PatientProfile, DoctorProfile, UserRole
from schemas.user_schema import PatientProfileUpdate, DoctorProfileUpdate, UserProfileUpdate
from core.security import get_current_user, get_current_admin
from models.consultation import Consultation, Appointment, ConsultationStatus, AppointmentStatus
import os, uuid

router = APIRouter(prefix="/profiles", tags=["Profile Management"])

@router.get("/me/full")
def get_full_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns the User base info + role-specific profile in one call."""
    base = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "address": current_user.address,
        "workplace": current_user.workplace,
        "profile_picture_url": current_user.profile_picture_url,
    }
    if current_user.role == UserRole.PATIENT:
        p = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        if p:
            base.update({"cnp": p.cnp, "known_allergies": p.known_allergies,
                         "current_medication": p.current_medication, "medical_history": p.medical_history})
    elif current_user.role == UserRole.DOCTOR:
        d = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
        if d:
            base.update({"specialization": d.specialization, "license_number": d.license_number})
    return base

@router.put("/me/user")
def update_user_profile(data: UserProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update shared profile fields (name, address, workplace) for any role."""
    if data.first_name is not None: current_user.first_name = data.first_name
    if data.last_name is not None:  current_user.last_name  = data.last_name
    if data.address is not None:    current_user.address    = data.address
    if data.workplace is not None:  current_user.workplace  = data.workplace
    db.commit()
    db.refresh(current_user)
    return {"message": "Profile updated.", "first_name": current_user.first_name, "last_name": current_user.last_name}

@router.post("/me/picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a profile picture. Accepts jpg/png/webp."""
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG and WebP images are allowed.")

    upload_dir = "uploads/avatars"
    os.makedirs(upload_dir, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    current_user.profile_picture_url = f"/static/avatars/{filename}"
    db.commit()
    return {"profile_picture_url": current_user.profile_picture_url}



@router.get("/dashboard-stats")
def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stats = {}
    if current_user.role == UserRole.DOCTOR:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
        stats["total_patients"] = db.query(Appointment.patient_id).filter(Appointment.doctor_id == doctor.id).distinct().count()
        stats["pending_appointments"] = db.query(Appointment).filter(Appointment.doctor_id == doctor.id, Appointment.status == AppointmentStatus.PENDING).count()
        stats["completed_consultations"] = db.query(Consultation).filter(Consultation.doctor_id == doctor.id, Consultation.status == ConsultationStatus.SIGNED).count()
    elif current_user.role == UserRole.PATIENT:
        patient = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        stats["total_consultations"] = db.query(Consultation).filter(Consultation.patient_id == patient.id).count()
        stats["upcoming_appointments"] = db.query(Appointment).filter(Appointment.patient_id == patient.id, Appointment.status == AppointmentStatus.CONFIRMED).count()
    elif current_user.role == UserRole.ADMIN:
        stats["total_doctors"] = db.query(DoctorProfile).count()
        stats["total_patients"] = db.query(PatientProfile).count()
        stats["total_consultations"] = db.query(Consultation).count()
        
    return stats

@router.get("/me")
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == UserRole.PATIENT:
        return db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    elif current_user.role == UserRole.DOCTOR:
        return db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    return {"message": "Authenticated as ADMIN"}

@router.put("/me/patient")
def update_my_patient_profile(profile_data: PatientProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient account.")
    
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    
    if profile_data.cnp: profile.cnp = profile_data.cnp
    if profile_data.known_allergies: profile.known_allergies = profile_data.known_allergies
    if profile_data.current_medication: profile.current_medication = profile_data.current_medication
    if profile_data.medical_history: profile.medical_history = profile_data.medical_history
    
    db.commit()
    db.refresh(profile)
    return profile

@router.put("/admin/patient/{patient_id}")
def admin_update_patient(patient_id: int, profile_data: PatientProfileUpdate, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    profile = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    if profile_data.cnp: profile.cnp = profile_data.cnp
    if profile_data.known_allergies: profile.known_allergies = profile_data.known_allergies
    if profile_data.current_medication: profile.current_medication = profile_data.current_medication
    if profile_data.medical_history: profile.medical_history = profile_data.medical_history    

    db.commit()
    db.refresh(profile)
    return profile

@router.put("/me/doctor")
def update_my_doctor_profile(profile_data: DoctorProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Not a doctor account.")
    
    profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    
    if profile_data.specialization: profile.specialization = profile_data.specialization
    if profile_data.license_number: profile.license_number = profile_data.license_number
    
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/admin/patients")
def get_all_patients(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(PatientProfile).all()

@router.get("/patients")
def get_patients_list(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can view patients.")
    patients = db.query(PatientProfile).all()
    result = []
    for p in patients:
        user = db.query(User).filter(User.id == p.user_id).first()
        result.append({
            "id": p.id,
            "cnp": p.cnp,
            "user_id": p.user_id,
            "first_name": user.first_name if user else None,
            "last_name": user.last_name if user else None,
            "profile_picture_url": user.profile_picture_url if user else None,
        })
    return result

@router.get("/doctors")
def get_doctors_list(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Public doctor listing — visible to patients when booking an appointment.
    Returns name and specialization ONLY. License number is intentionally omitted.
    """
    doctors = db.query(DoctorProfile).all()
    result = []
    for d in doctors:
        user = db.query(User).filter(User.id == d.user_id).first()
        if not user:
            continue
        first = (user.first_name or "").strip()
        last  = (user.last_name  or "").strip()
        # Fall back to email prefix only if the doctor has no name set yet
        display_name = f"{first} {last}".strip() or user.email.split("@")[0]
        result.append({
            "id":           d.id,
            "specialization": d.specialization,
            "first_name":   first,
            "last_name":    last,
            "display_name": display_name,
            "profile_picture_url": user.profile_picture_url,
        })
    return result

@router.get("/admin/doctors")
def get_all_doctors(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(DoctorProfile).all()

@router.delete("/admin/users/{user_id}")
def delete_user(user_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if user.role == UserRole.PATIENT:
        db.query(PatientProfile).filter(PatientProfile.user_id == user.id).delete()
    elif user.role == UserRole.DOCTOR:
        db.query(DoctorProfile).filter(DoctorProfile.user_id == user.id).delete()
    
    db.delete(user)
    db.commit()
    return {"message": f"User with ID {user_id} has been deleted."}