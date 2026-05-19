"""Tests for profile management endpoints."""

from tests.conftest import (
    create_patient, create_doctor, create_admin,
    register_user, login_user, auth_header, ADMIN_SECRET,
)


def test_get_my_patient_profile(client):
    pat_token, pat_id = create_patient(client, "profil@test.com")
    res = client.get("/profiles/me", headers=auth_header(pat_token))
    assert res.status_code == 200
    assert res.json()["cnp"].startswith("TEMP_")


def test_unauthorized_access_fails(client):
    res = client.get("/profiles/me")
    assert res.status_code == 401


def test_doctor_update_profile(client):
    doc_token, _ = create_doctor(client, "medic@test.com")
    res = client.put("/profiles/me/doctor", headers=auth_header(doc_token),
        json={"specialization": "Cardiologie", "license_number": "MED123"})
    assert res.status_code == 200
    assert res.json()["specialization"] == "Cardiologie"


def test_patient_update_profile(client):
    pat_token, _ = create_patient(client, "update_p@test.com")
    res = client.put("/profiles/me/patient", headers=auth_header(pat_token),
        json={"cnp": "1990101123456", "known_allergies": "Aspirină",
              "medical_history": "Hipertensiune arterială"})
    assert res.status_code == 200
    assert res.json()["cnp"] == "1990101123456"


def test_admin_crud_operations(client):
    admin_token = create_admin(client, "admin@test.com")
    register_user(client, "del_patient@test.com", "PATIENT")

    res = client.get("/profiles/admin/patients", headers=auth_header(admin_token))
    assert res.status_code == 200
    patients = res.json()
    assert len(patients) > 0

    user_id = patients[-1]["user_id"]
    res = client.delete(f"/profiles/admin/users/{user_id}", headers=auth_header(admin_token))
    assert res.status_code == 200
    assert "has been deleted" in res.json()["message"]