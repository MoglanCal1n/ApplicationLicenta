from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from models.consultation import AppointmentStatus


class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: datetime
    pre_consult_audio: Optional[str] = None
    anamnesia_draft_text: Optional[str] = None


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    status: AppointmentStatus
    pre_consult_audio: Optional[str] = None
    anamnesia_draft_text: Optional[str] = None
    is_deleted: bool = False
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Admin-specific schemas ────────────────────────────────────────────────────

class AdminAppointmentCreate(BaseModel):
    """Admin can create appointments specifying both patient and doctor."""
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    status: AppointmentStatus = AppointmentStatus.PENDING
    pre_consult_audio: Optional[str] = None
    anamnesia_draft_text: Optional[str] = None


class AdminAppointmentUpdate(BaseModel):
    """Admin can update any field on an appointment."""
    doctor_id: Optional[int] = None
    patient_id: Optional[int] = None
    appointment_date: Optional[datetime] = None
    status: Optional[AppointmentStatus] = None
    pre_consult_audio: Optional[str] = None
    anamnesia_draft_text: Optional[str] = None


class PaginatedResponse(BaseModel):
    """Wrapper for paginated list responses."""
    items: list
    total: int
    page: int
    limit: int
    pages: int
