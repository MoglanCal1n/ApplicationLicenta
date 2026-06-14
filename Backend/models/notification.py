"""
Notification model — stores in-app notifications for users.
Delivered via REST API and pushed in real-time via WebSocket.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from db.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    type = Column(String, nullable=False)       # e.g. APPOINTMENT_BOOKED, APPOINTMENT_CONFIRMED, CONSULTATION_FINALIZED
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    metadata_json = Column(JSON, nullable=True)  # e.g. {"appointment_id": 5, "doctor_name": "..."}
    created_at = Column(DateTime, default=datetime.now, nullable=False)
