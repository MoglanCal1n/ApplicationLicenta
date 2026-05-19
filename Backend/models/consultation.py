import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from db.database import Base


class AppointmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"
    REJECTED = "REJECTED"


class ConsultationStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SIGNED = "SIGNED"


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)
    appointment_date = Column(DateTime, nullable=False)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.PENDING, nullable=False)

    pre_consult_audio = Column(String, nullable=True)
    anamnesia_draft_text = Column(String, nullable=True)

    # ── Soft delete ───────────────────────────────────────────────────────
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    # ── Audit trail ───────────────────────────────────────────────────────
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    patient = relationship("PatientProfile", back_populates="appointments")
    doctor = relationship("DoctorProfile", back_populates="appointments")
    consultation = relationship("Consultation", back_populates="appointment", uselist=False)


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), unique=True, nullable=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)

    consult_audio_url = Column(String, nullable=True)
    ai_draft_transcript = Column(Text, nullable=True)
    mixed_score_metadata = Column(JSON, nullable=True)

    final_revised_text = Column(Text, nullable=True)
    pdf_report_url = Column(String, nullable=True)
    status = Column(Enum(ConsultationStatus), default=ConsultationStatus.DRAFT, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    signed_at = Column(DateTime, nullable=True)

    # ── Soft delete ───────────────────────────────────────────────────────
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    # ── Audit trail ───────────────────────────────────────────────────────
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    appointment = relationship("Appointment", back_populates="consultation")
    patient = relationship("PatientProfile")
    doctor = relationship("DoctorProfile")