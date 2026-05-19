from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime

from db.database import get_db
from models.user import User, UserRole, DoctorProfile, PatientProfile
from models.consultation import Appointment, AppointmentStatus, Consultation, ConsultationStatus
from core.security import get_current_user

router = APIRouter(prefix="/stats", tags=["Dashboard Statistics"])

@router.get("/doctor")
def get_doctor_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    doctor_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not doctor_profile:
        return {"total_patients": 0, "consultations_today": 0, "upcoming_appointments": 0, "pending_appointments": 0}

    total_patients = db.query(func.count(func.distinct(Appointment.patient_id)))\
        .filter(
            Appointment.doctor_id == doctor_profile.id,
            Appointment.status != AppointmentStatus.REJECTED
        ).scalar() or 0

    today = datetime.now().date()
    consultations_today = db.query(Consultation)\
        .filter(
            Consultation.doctor_id == doctor_profile.id,
            func.date(Consultation.created_at) == today,
            Consultation.status == ConsultationStatus.SIGNED
        ).count()

    # Upcoming = CONFIRMED appointments in the future
    upcoming_appointments = db.query(Appointment)\
        .filter(
            Appointment.doctor_id == doctor_profile.id,
            Appointment.status == AppointmentStatus.CONFIRMED,
            Appointment.appointment_date >= datetime.now()
        ).count()

    # Pending = waiting for doctor action
    pending_appointments = db.query(Appointment)\
        .filter(
            Appointment.doctor_id == doctor_profile.id,
            Appointment.status == AppointmentStatus.PENDING
        ).count()

    return {
        "total_patients": total_patients,
        "consultations_today": consultations_today,
        "upcoming_appointments": upcoming_appointments,
        "pending_appointments": pending_appointments
    }

@router.get("/patient")
def get_patient_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not patient_profile:
        return {"total_consultations": 0, "upcoming_appointments": 0}

    total_consultations = db.query(Consultation)\
        .filter(
            Consultation.patient_id == patient_profile.id,
            Consultation.status == ConsultationStatus.SIGNED
        ).count()

    upcoming_appointments = db.query(Appointment)\
        .filter(
            Appointment.patient_id == patient_profile.id,
            Appointment.status == AppointmentStatus.CONFIRMED,
            Appointment.appointment_date >= datetime.now()
        ).count()

    return {
        "total_consultations": total_consultations,
        "upcoming_appointments": upcoming_appointments
    }
