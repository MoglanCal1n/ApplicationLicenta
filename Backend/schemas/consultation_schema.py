from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from models.consultation import ConsultationStatus


class ConsultationCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    consult_audio_url: Optional[str] = None
    ai_draft_transcript: Optional[str] = None
    mixed_score_metadata: Optional[List[Dict[str, Any]]] = None


class ConsultationFinalize(BaseModel):
    """Legacy plain-text finalize (kept for backward compat)."""
    final_revised_text: str


class ConsultationFinalizeStructured(BaseModel):
    """Structured consultation finalize with named medical fields."""
    # Free-text edited transcript (the WYSIWYG content)
    final_revised_text: str
    # Structured template fields — all optional so plain-text flow still works
    symptoms: Optional[str] = None
    diagnosis: Optional[str] = None
    recommendations: Optional[str] = None
    prescriptions: Optional[str] = None


class ExtractTextRequest(BaseModel):
    text: str


class ConsultationResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_id: Optional[int] = None
    ai_draft_transcript: Optional[str] = None
    mixed_score_metadata: Optional[Any] = None
    final_revised_text: Optional[str] = None
    status: ConsultationStatus
    created_at: datetime
    signed_at: Optional[datetime] = None
    is_deleted: bool = False
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Admin-specific schemas ────────────────────────────────────────────────────

class AdminConsultationCreate(BaseModel):
    """Admin can create consultation records directly."""
    patient_id: int
    doctor_id: int
    appointment_id: Optional[int] = None
    ai_draft_transcript: Optional[str] = None
    final_revised_text: Optional[str] = None
    status: ConsultationStatus = ConsultationStatus.DRAFT


class AdminConsultationUpdate(BaseModel):
    """Admin can update any field on a consultation."""
    patient_id: Optional[int] = None
    doctor_id: Optional[int] = None
    ai_draft_transcript: Optional[str] = None
    final_revised_text: Optional[str] = None
    status: Optional[ConsultationStatus] = None
