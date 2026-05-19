"""
Tests for appointment endpoints:
- Patient requesting appointments
- Doctor accepting/rejecting
- My appointments (pagination + filtering)
- Appointment by ID access control
"""

from datetime import datetime, timedelta
from tests.conftest import (
    create_patient, create_doctor, create_admin,
    auth_header, register_user, login_user, ADMIN_SECRET,
)


def _future_date(days: int = 2) -> str:
    return (datetime.now() + timedelta(days=days)).isoformat()


# ── Happy path ────────────────────────────────────────────────────────────────

def test_appointment_full_flow(client):
    """Patient requests → Doctor confirms → both can view."""
    pat_token, _ = create_patient(client, "pat_flow@test.com")
    doc_token, doc_id = create_doctor(client, "doc_flow@test.com")

    # Patient requests appointment
    res = client.post(
        "/appointments/request",
        headers=auth_header(pat_token),
        json={"doctor_id": doc_id, "appointment_date": _future_date()}
    )
    assert res.status_code == 201
    assert res.json()["status"] == "PENDING"
    appt_id = res.json()["id"]

    # Doctor confirms
    res = client.put(
        f"/appointments/{appt_id}/status",
        headers=auth_header(doc_token),
        json={"status": "CONFIRMED"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "CONFIRMED"

    # Patient sees it
    res = client.get("/appointments/me", headers=auth_header(pat_token))
    assert res.status_code == 200
    assert len(res.json()) >= 1
    assert res.json()[0]["status"] == "CONFIRMED"


def test_appointment_new_statuses(client):
    """Test the new CANCELLED, SCHEDULED, NO_SHOW statuses."""
    pat_token, _ = create_patient(client, "pat_status@test.com")
    doc_token, doc_id = create_doctor(client, "doc_status@test.com")

    # Create appointment
    res = client.post(
        "/appointments/request",
        headers=auth_header(pat_token),
        json={"doctor_id": doc_id, "appointment_date": _future_date()}
    )
    appt_id = res.json()["id"]

    # Doctor marks as SCHEDULED
    res = client.put(
        f"/appointments/{appt_id}/status",
        headers=auth_header(doc_token),
        json={"status": "SCHEDULED"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "SCHEDULED"

    # Doctor marks as NO_SHOW
    res = client.put(
        f"/appointments/{appt_id}/status",
        headers=auth_header(doc_token),
        json={"status": "NO_SHOW"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "NO_SHOW"


# ── Role enforcement ─────────────────────────────────────────────────────────

def test_doctor_cannot_request_appointment(client):
    doc_token, doc_id = create_doctor(client, "doc_req@test.com")
    res = client.post(
        "/appointments/request",
        headers=auth_header(doc_token),
        json={"doctor_id": doc_id, "appointment_date": _future_date()}
    )
    assert res.status_code == 403


def test_patient_cannot_update_status(client):
    pat_token, _ = create_patient(client, "pat_upd@test.com")
    doc_token, doc_id = create_doctor(client, "doc_upd@test.com")

    res = client.post(
        "/appointments/request",
        headers=auth_header(pat_token),
        json={"doctor_id": doc_id, "appointment_date": _future_date()}
    )
    appt_id = res.json()["id"]

    # Patient tries to update status → 403
    res = client.put(
        f"/appointments/{appt_id}/status",
        headers=auth_header(pat_token),
        json={"status": "CONFIRMED"}
    )
    assert res.status_code == 403


def test_wrong_doctor_cannot_update(client):
    pat_token, _ = create_patient(client, "pat_wrong@test.com")
    doc_token, doc_id = create_doctor(client, "doc_correct@test.com")
    doc2_token, _ = create_doctor(client, "doc_wrong@test.com")

    res = client.post(
        "/appointments/request",
        headers=auth_header(pat_token),
        json={"doctor_id": doc_id, "appointment_date": _future_date()}
    )
    appt_id = res.json()["id"]

    # Wrong doctor tries to update
    res = client.put(
        f"/appointments/{appt_id}/status",
        headers=auth_header(doc2_token),
        json={"status": "CONFIRMED"}
    )
    assert res.status_code == 403


# ── Edge cases ────────────────────────────────────────────────────────────────

def test_appointment_not_found(client):
    doc_token, _ = create_doctor(client, "doc_nf@test.com")
    res = client.put(
        "/appointments/99999/status",
        headers=auth_header(doc_token),
        json={"status": "CONFIRMED"}
    )
    assert res.status_code == 404


def test_appointment_nonexistent_doctor(client):
    pat_token, _ = create_patient(client, "pat_nd@test.com")
    res = client.post(
        "/appointments/request",
        headers=auth_header(pat_token),
        json={"doctor_id": 99999, "appointment_date": _future_date()}
    )
    assert res.status_code == 404


def test_get_appointment_by_id(client):
    pat_token, _ = create_patient(client, "pat_byid@test.com")
    doc_token, doc_id = create_doctor(client, "doc_byid@test.com")

    res = client.post(
        "/appointments/request",
        headers=auth_header(pat_token),
        json={"doctor_id": doc_id, "appointment_date": _future_date()}
    )
    appt_id = res.json()["id"]

    # Patient can view their own
    res = client.get(f"/appointments/{appt_id}", headers=auth_header(pat_token))
    assert res.status_code == 200
    assert res.json()["id"] == appt_id

    # Doctor can view theirs
    res = client.get(f"/appointments/{appt_id}", headers=auth_header(doc_token))
    assert res.status_code == 200


def test_get_appointment_by_id_not_found(client):
    pat_token, _ = create_patient(client, "pat_byid404@test.com")
    res = client.get("/appointments/99999", headers=auth_header(pat_token))
    assert res.status_code == 404


def test_unauthenticated_access(client):
    res = client.get("/appointments/me")
    assert res.status_code == 401


# ── Audit trail ───────────────────────────────────────────────────────────────

def test_appointment_has_audit_fields(client):
    pat_token, _ = create_patient(client, "pat_audit@test.com")
    _, doc_id = create_doctor(client, "doc_audit@test.com")

    res = client.post(
        "/appointments/request",
        headers=auth_header(pat_token),
        json={"doctor_id": doc_id, "appointment_date": _future_date()}
    )
    assert res.status_code == 201
    data = res.json()
    assert "created_by" in data
    assert data["created_by"] is not None
    assert "updated_by" in data
