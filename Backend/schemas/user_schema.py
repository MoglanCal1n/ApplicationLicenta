from pydantic import BaseModel, EmailStr, ConfigDict
from models.user import UserRole
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole = UserRole.PATIENT
    admin_code: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    address: Optional[str] = None
    workplace: Optional[str] = None
    profile_picture_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    address: Optional[str] = None
    workplace: Optional[str] = None

class PatientProfileUpdate(BaseModel):
    cnp: Optional[str] = None
    known_allergies: Optional[str] = None
    current_medication: Optional[str] = None
    medical_history: Optional[str] = None

class DoctorProfileUpdate(BaseModel):
    specialization: Optional[str] = None
    license_number: Optional[str] = None