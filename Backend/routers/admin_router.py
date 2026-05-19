"""
Admin Router — Full CRUD operations on consultations and cross-resource admin views.

All endpoints require the ADMIN role via get_current_admin dependency.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import math

from db.database import get_db
from models.user import User, UserRole, DoctorProfile, PatientProfile
from models.consultation import Consultation, ConsultationStatus, Appointment
from schemas.consultation_schema import (
    ConsultationResponse, AdminConsultationCreate, AdminConsultationUpdate,
)
from core.security import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _base_query(db: Session):
    """Base query excluding soft-deleted consultations."""
    return db.query(Consultation).filter(Consultation.is_deleted == False)


# ── List all consultations (paginated + filtered) ─────────────────────────────

@router.get("/consultations")
def admin_list_all_consultations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[ConsultationStatus] = None,
    doctor_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    include_deleted: bool = Query(False),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: paginated list of ALL consultations with filtering."""
    query = db.query(Consultation)

    if not include_deleted:
        query = query.filter(Consultation.is_deleted == False)

    if status:
        query = query.filter(Consultation.status == status)
    if doctor_id:
        query = query.filter(Consultation.doctor_id == doctor_id)
    if patient_id:
        query = query.filter(Consultation.patient_id == patient_id)
    if date_from:
        try:
            query = query.filter(Consultation.created_at >= datetime.strptime(date_from, "%Y-%m-%d"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD.")
    if date_to:
        try:
            query = query.filter(Consultation.created_at <= datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD.")

    total = query.count()
    skip = (page - 1) * limit
    items = query.order_by(Consultation.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "items": [ConsultationResponse.model_validate(i).model_dump() for i in items],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if total > 0 else 0,
    }


# ── Get single consultation by ID ─────────────────────────────────────────────

@router.get("/consultations/{consultation_id}", response_model=ConsultationResponse)
def admin_get_consultation(
    consultation_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: get any consultation by ID (including soft-deleted)."""
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found.")
    return consultation


# ── Create a consultation record ──────────────────────────────────────────────

@router.post("/consultations", response_model=ConsultationResponse, status_code=status.HTTP_201_CREATED)
def admin_create_consultation(
    data: AdminConsultationCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: create a consultation record directly (e.g., for data entry/migration)."""
    # Validate patient
    patient = db.query(PatientProfile).filter(PatientProfile.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    # Validate doctor
    doctor = db.query(DoctorProfile).filter(DoctorProfile.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    # Validate appointment if provided
    if data.appointment_id:
        appointment = db.query(Appointment).filter(Appointment.id == data.appointment_id).first()
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found.")

    consultation = Consultation(
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        appointment_id=data.appointment_id,
        ai_draft_transcript=data.ai_draft_transcript,
        final_revised_text=data.final_revised_text,
        status=data.status,
        created_by=admin.id,
        updated_by=admin.id,
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return consultation


# ── Update a consultation ─────────────────────────────────────────────────────

@router.put("/consultations/{consultation_id}", response_model=ConsultationResponse)
def admin_update_consultation(
    consultation_id: int,
    data: AdminConsultationUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: update any fields on a consultation."""
    consultation = _base_query(db).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    if data.patient_id is not None:
        patient = db.query(PatientProfile).filter(PatientProfile.id == data.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient profile not found.")
        consultation.patient_id = data.patient_id

    if data.doctor_id is not None:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.id == data.doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor profile not found.")
        consultation.doctor_id = data.doctor_id

    if data.ai_draft_transcript is not None:
        consultation.ai_draft_transcript = data.ai_draft_transcript
    if data.final_revised_text is not None:
        consultation.final_revised_text = data.final_revised_text
    if data.status is not None:
        consultation.status = data.status
        if data.status == ConsultationStatus.SIGNED:
            consultation.signed_at = datetime.now()

    consultation.updated_by = admin.id
    db.commit()
    db.refresh(consultation)
    return consultation


# ── Soft-delete a consultation ────────────────────────────────────────────────

@router.delete("/consultations/{consultation_id}")
def admin_soft_delete_consultation(
    consultation_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: soft-delete a consultation (sets is_deleted=True)."""
    consultation = _base_query(db).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    consultation.is_deleted = True
    consultation.deleted_at = datetime.now()
    consultation.updated_by = admin.id
    db.commit()

    return {"message": f"Consultation {consultation_id} soft-deleted.", "id": consultation_id}


# ── Admin stats overview ──────────────────────────────────────────────────────

@router.get("/stats")
def admin_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: system-wide statistics."""
    return {
        "total_users": db.query(User).count(),
        "total_patients": db.query(PatientProfile).count(),
        "total_doctors": db.query(DoctorProfile).count(),
        "total_appointments": db.query(Appointment).filter(Appointment.is_deleted == False).count(),
        "total_consultations": db.query(Consultation).filter(Consultation.is_deleted == False).count(),
        "pending_appointments": db.query(Appointment).filter(
            Appointment.is_deleted == False,
            Appointment.status == "PENDING"
        ).count(),
        "draft_consultations": db.query(Consultation).filter(
            Consultation.is_deleted == False,
            Consultation.status == "DRAFT"
        ).count(),
    }
