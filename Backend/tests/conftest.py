"""
Shared test fixtures for the E-Health AI backend test suite.

Uses an in-memory SQLite database with StaticPool to provide fast, isolated
test runs. Each test function gets a fresh database via the `db_session` fixture.

Helper functions provide pre-registered users with tokens for convenience.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from db.database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    del app.dependency_overrides[get_db]


# ── Helper functions ──────────────────────────────────────────────────────────

ADMIN_SECRET = "cod_secret_medic_2026"


def register_user(client: TestClient, email: str, role: str = "PATIENT", admin_code: str = None) -> dict:
    """Register a user and return the response JSON."""
    payload = {"email": email, "password": "test_password_123", "role": role}
    if admin_code:
        payload["admin_code"] = admin_code
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 201, f"Registration failed for {email}: {res.json()}"
    return res.json()


def login_user(client: TestClient, email: str, password: str = "test_password_123") -> str:
    """Login a user and return their Bearer token."""
    res = client.post("/auth/login", data={"username": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.json()}"
    return res.json()["access_token"]


def auth_header(token: str) -> dict:
    """Build an Authorization header dict."""
    return {"Authorization": f"Bearer {token}"}


def create_patient(client: TestClient, email: str = "patient@test.com") -> tuple[str, int]:
    """Register + login a patient, return (token, patient_profile_id)."""
    register_user(client, email, "PATIENT")
    token = login_user(client, email)
    profile = client.get("/profiles/me", headers=auth_header(token)).json()
    return token, profile["id"]


def create_doctor(client: TestClient, email: str = "doctor@test.com") -> tuple[str, int]:
    """Register + login a doctor, return (token, doctor_profile_id)."""
    register_user(client, email, "DOCTOR", admin_code=ADMIN_SECRET)
    token = login_user(client, email)
    profile = client.get("/profiles/me", headers=auth_header(token)).json()
    return token, profile["id"]


def create_admin(client: TestClient, email: str = "admin@test.com") -> str:
    """Register + login an admin, return token."""
    register_user(client, email, "ADMIN", admin_code=ADMIN_SECRET)
    return login_user(client, email)