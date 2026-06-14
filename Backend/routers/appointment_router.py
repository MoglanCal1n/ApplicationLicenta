from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, time, timedelta
import math

from db.database import get_db
from models.user import User, UserRole, DoctorProfile, PatientProfile
from models.consultation import Appointment, AppointmentStatus
from schemas.appointment_schema import (
    AppointmentCreate, AppointmentStatusUpdate, AppointmentResponse,
    AdminAppointmentCreate, AdminAppointmentUpdate, PaginatedResponse,
)
from core.security import get_current_user, get_current_admin
from services.notification_service import send_email
from routers.notification_router import create_and_push_notification

router = APIRouter(prefix="/appointments", tags=["Appointments"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _base_query(db: Session):
    """Base query that excludes soft-deleted records."""
    return db.query(Appointment).filter(Appointment.is_deleted == False)


# ─── Available Slots ─────────────────────────────────────────────────────────

@router.get("/available-slots")
def get_available_slots(
    doctor_id: int = Query(...),
    date_str: str = Query(..., alias="date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns all 30-min slots from 07:00-19:00, marking which are already booked."""
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Generate all slots 07:00 to 18:30 (every 30 min)
    all_slots = []
    slot_time = datetime.combine(target_date, time(7, 0))
    end_time = datetime.combine(target_date, time(19, 0))
    while slot_time < end_time:
        all_slots.append(slot_time.strftime("%H:%M"))
        slot_time += timedelta(minutes=30)

    # Find already booked appointments for this doctor on this date
    day_start = datetime.combine(target_date, time(0, 0))
    day_end = datetime.combine(target_date, time(23, 59))
    booked = _base_query(db).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date >= day_start,
        Appointment.appointment_date <= day_end,
        Appointment.status.notin_([AppointmentStatus.REJECTED, AppointmentStatus.CANCELLED])
    ).all()

    booked_times = set()
    for appt in booked:
        booked_times.add(appt.appointment_date.strftime("%H:%M"))

    return [{"time": s, "available": s not in booked_times} for s in all_slots]


# ─── Patient requests an appointment ─────────────────────────────────────────

@router.post("/request", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def request_appointment(
    appointment_data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can request appointments.")

    patient = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    doctor = db.query(DoctorProfile).filter(DoctorProfile.id == appointment_data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    new_appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        appointment_date=appointment_data.appointment_date,
        pre_consult_audio=appointment_data.pre_consult_audio,
        anamnesia_draft_text=appointment_data.anamnesia_draft_text,
        status=AppointmentStatus.PENDING,
        created_by=current_user.id,
        updated_by=current_user.id,
    )

    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    # Notify the doctor about new appointment request
    patient_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email
    doctor_user = db.query(User).filter(User.id == doctor.user_id).first()
    if doctor_user:
        await create_and_push_notification(
            db=db,
            user_id=doctor_user.id,
            notification_type="APPOINTMENT_BOOKED",
            title="New Appointment Request",
            message=f"{patient_name} has requested an appointment on {new_appointment.appointment_date.strftime('%d %b %Y at %H:%M')}.",
            metadata={"appointment_id": new_appointment.id},
        )

    return new_appointment


# ─── Doctor updates appointment status ────────────────────────────────────────

@router.put("/{appointment_id}/status", response_model=AppointmentResponse)
async def update_appointment_status(
    appointment_id: int,
    status_update: AppointmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can update appointment statuses.")

    doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()

    appointment = _base_query(db).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if appointment.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this appointment.")

    if appointment.status == status_update.status:
        # Idempotent skip: already updated, prevent duplicate notifications
        return appointment

    appointment.status = status_update.status
    appointment.updated_by = current_user.id
    db.commit()
    db.refresh(appointment)

    # Send notification to patient (email + in-app)
    patient = db.query(PatientProfile).filter(PatientProfile.id == appointment.patient_id).first()
    patient_user = db.query(User).filter(User.id == patient.user_id).first()

    email_body = f"Hello,\n\nYour appointment with Doctor {doctor.license_number} on {appointment.appointment_date} has been {appointment.status.value}."
    send_email(patient_user.email, "Appointment Status Update", email_body)

    # In-app notification via WebSocket
    doctor_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email
    status_label = appointment.status.value.lower()
    if patient_user:
        await create_and_push_notification(
            db=db,
            user_id=patient_user.id,
            notification_type=f"APPOINTMENT_{appointment.status.value}",
            title=f"Appointment {status_label.title()}",
            message=f"Dr. {doctor_name} has {status_label} your appointment on {appointment.appointment_date.strftime('%d %b %Y at %H:%M')}.",
            metadata={"appointment_id": appointment.id},
        )

    return appointment


# ─── My appointments (patient/doctor) ─────────────────────────────────────────

@router.get("/me")
def get_my_appointments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[AppointmentStatus] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = _base_query(db)

    if current_user.role == UserRole.PATIENT:
        patient = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient profile not found.")
        query = query.filter(Appointment.patient_id == patient.id)
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor profile not found.")
        query = query.filter(Appointment.doctor_id == doctor.id)
    else:
        raise HTTPException(status_code=403, detail="Use /appointments/admin/all for admin access.")

    if status:
        query = query.filter(Appointment.status == status)

    if date_from:
        try:
            query = query.filter(Appointment.appointment_date >= datetime.strptime(date_from, "%Y-%m-%d"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD.")
    if date_to:
        try:
            query = query.filter(Appointment.appointment_date <= datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD.")

    skip = (page - 1) * limit
    appointments = query.order_by(Appointment.appointment_date.desc()).offset(skip).limit(limit).all()

    # Enrich with profile data
    result = []
    for appt in appointments:
        data = AppointmentResponse.model_validate(appt).model_dump()

        if current_user.role == UserRole.DOCTOR:
            # Doctor sees patient info
            pat_profile = db.query(PatientProfile).filter(PatientProfile.id == appt.patient_id).first()
            pat_user = db.query(User).filter(User.id == pat_profile.user_id).first() if pat_profile else None
            if pat_user:
                first = (pat_user.first_name or "").strip()
                last = (pat_user.last_name or "").strip()
                data["patient_name"] = f"{first} {last}".strip() or pat_user.email.split("@")[0]
                data["patient_picture_url"] = pat_user.profile_picture_url
                data["patient_email"] = pat_user.email
            else:
                data["patient_name"] = f"Patient #{appt.patient_id}"
                data["patient_picture_url"] = None
                data["patient_email"] = None
        elif current_user.role == UserRole.PATIENT:
            # Patient sees doctor info
            doc_profile = db.query(DoctorProfile).filter(DoctorProfile.id == appt.doctor_id).first()
            doc_user = db.query(User).filter(User.id == doc_profile.user_id).first() if doc_profile else None
            if doc_user:
                first = (doc_user.first_name or "").strip()
                last = (doc_user.last_name or "").strip()
                data["doctor_name"] = f"{first} {last}".strip() or doc_user.email.split("@")[0]
                data["doctor_picture_url"] = doc_user.profile_picture_url
                data["doctor_specialization"] = doc_profile.specialization if doc_profile else None
            else:
                data["doctor_name"] = f"Doctor #{appt.doctor_id}"
                data["doctor_picture_url"] = None
                data["doctor_specialization"] = None

        result.append(data)

    return result


# ─── Get by ID ────────────────────────────────────────────────────────────────

@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment_by_id(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appointment = _base_query(db).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    # Admins can view any appointment
    if current_user.role == UserRole.ADMIN:
        return appointment

    if current_user.role == UserRole.PATIENT:
        patient = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        if not patient or appointment.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this appointment.")
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
        if not doctor or appointment.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this appointment.")

    return appointment


# ══════════════════════════════════════════════════════════════════════════════
# ██  ADMIN ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/admin/all")
def admin_list_all_appointments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[AppointmentStatus] = None,
    doctor_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    include_deleted: bool = Query(False),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: paginated list of ALL appointments with filtering."""
    query = db.query(Appointment)

    if not include_deleted:
        query = query.filter(Appointment.is_deleted == False)

    if status:
        query = query.filter(Appointment.status == status)
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
    if date_from:
        try:
            query = query.filter(Appointment.appointment_date >= datetime.strptime(date_from, "%Y-%m-%d"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format.")
    if date_to:
        try:
            query = query.filter(Appointment.appointment_date <= datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format.")

    total = query.count()
    skip = (page - 1) * limit
    items = query.order_by(Appointment.appointment_date.desc()).offset(skip).limit(limit).all()

    return {
        "items": [AppointmentResponse.model_validate(i).model_dump() for i in items],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if total > 0 else 0,
    }


@router.post("/admin/create", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def admin_create_appointment(
    data: AdminAppointmentCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: create an appointment specifying patient_id and doctor_id."""
    patient = db.query(PatientProfile).filter(PatientProfile.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    doctor = db.query(DoctorProfile).filter(DoctorProfile.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    appointment = Appointment(
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        appointment_date=data.appointment_date,
        status=data.status,
        pre_consult_audio=data.pre_consult_audio,
        anamnesia_draft_text=data.anamnesia_draft_text,
        created_by=admin.id,
        updated_by=admin.id,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.put("/admin/{appointment_id}", response_model=AppointmentResponse)
def admin_update_appointment(
    appointment_id: int,
    data: AdminAppointmentUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: update any fields on an appointment (reassign doctor, change time, etc.)."""
    appointment = _base_query(db).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if data.doctor_id is not None:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.id == data.doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor profile not found.")
        appointment.doctor_id = data.doctor_id

    if data.patient_id is not None:
        patient = db.query(PatientProfile).filter(PatientProfile.id == data.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient profile not found.")
        appointment.patient_id = data.patient_id

    if data.appointment_date is not None:
        appointment.appointment_date = data.appointment_date
    if data.status is not None:
        appointment.status = data.status
    if data.pre_consult_audio is not None:
        appointment.pre_consult_audio = data.pre_consult_audio
    if data.anamnesia_draft_text is not None:
        appointment.anamnesia_draft_text = data.anamnesia_draft_text

    appointment.updated_by = admin.id
    db.commit()
    db.refresh(appointment)
    return appointment


@router.delete("/admin/{appointment_id}")
def admin_soft_delete_appointment(
    appointment_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: soft-delete an appointment (sets is_deleted=True)."""
    appointment = _base_query(db).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    appointment.is_deleted = True
    appointment.deleted_at = datetime.now()
    appointment.updated_by = admin.id
    db.commit()

    return {"message": f"Appointment {appointment_id} soft-deleted.", "id": appointment_id}
