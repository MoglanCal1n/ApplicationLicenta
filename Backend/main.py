from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from db.database import engine, Base
import os

from models import user, consultation 
from routers import auth_router, profile_router, consultation_router, appointment_router, stats_router, e2ee_router, admin_router

Base.metadata.create_all(bind=engine)

# ── Sync Python enum values into PostgreSQL ──────────────────────────────────
# SQLAlchemy's create_all does NOT add new values to existing PG enum types.
# This block ensures the DB enum stays in sync with the Python model.
from sqlalchemy import text as _text
_ENUM_SYNC = {
    "appointmentstatus": [e.value for e in consultation.AppointmentStatus],
    "consultationstatus": [e.value for e in consultation.ConsultationStatus],
}
with engine.connect() as _conn:
    for _pg_type, _py_values in _ENUM_SYNC.items():
        for _val in _py_values:
            try:
                _conn.execute(_text(
                    f"ALTER TYPE {_pg_type} ADD VALUE IF NOT EXISTS '{_val}'"
                ))
                _conn.commit()
            except Exception:
                _conn.rollback()

os.makedirs("uploads/audio", exist_ok=True)
os.makedirs("uploads/pdf", exist_ok=True)
os.makedirs("uploads/avatars", exist_ok=True)
os.makedirs("uploads/temp", exist_ok=True)
os.makedirs("uploads/encrypted", exist_ok=True)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="E-Health Platform",
    description="API for the AI medical application",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        os.environ.get("FRONTEND_URL", "http://localhost:5173")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static/audio", StaticFiles(directory="uploads/audio"), name="audio")
app.mount("/static/pdf", StaticFiles(directory="uploads/pdf"), name="pdf")
app.mount("/static/avatars", StaticFiles(directory="uploads/avatars"), name="avatars")

app.include_router(auth_router.router)
app.include_router(profile_router.router)
app.include_router(consultation_router.router)
app.include_router(appointment_router.router)
app.include_router(stats_router.router)
app.include_router(e2ee_router.router)
app.include_router(admin_router.router)

@app.get("/")
def health_check():
    return {"status": "success", "message": "API is working and connected to the database!"}