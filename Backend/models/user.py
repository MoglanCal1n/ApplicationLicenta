import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from db.database import Base

class UserRole(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.PATIENT, nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    # Profile fields — populated after first login
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    address = Column(String, nullable=True)
    workplace = Column(String, nullable=True)
    profile_picture_url = Column(String, nullable=True)

    # E2EE: ECDH public key in JWK format — server stores but cannot use for decryption
    e2ee_public_key = Column(Text, nullable=True)
    
    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False)
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False)

class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    cnp = Column(String, unique=True, nullable=False)
    known_allergies = Column(String, nullable=True)
    current_medication = Column(String, nullable=True)
    medical_history = Column(String, nullable=True)

    user = relationship("User", back_populates="patient_profile")
    appointments = relationship("Appointment", back_populates="patient")

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    specialization = Column(String, nullable=False)
    license_number = Column(String, unique=True, nullable=False)

    user = relationship("User", back_populates="doctor_profile")
    appointments = relationship("Appointment", back_populates="doctor")