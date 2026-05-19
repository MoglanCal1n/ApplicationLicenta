"""Tests for consultation endpoints: transcribe, history, finalize, extract."""

import io
from unittest.mock import patch
from tests.conftest import create_patient, create_doctor, create_admin, auth_header


MOCK_TRANSCRIPTION = {
    "text_simple": "Acesta este un test medical.",
    "text_format_html": "<span>test</span>",
    "corection_total": 0,
    "corection_log": []
}


def _create_consultation(client, doc_token, patient_id):
    """Helper: create a consultation via mocked transcription."""
    with patch("routers.consultation_router.process_hybrid_transcription") as m:
        m.return_value = MOCK_TRANSCRIPTION
        res = client.post("/consultations/transcribe",
            headers=auth_header(doc_token),
            data={"patient_id": patient_id},
            files={"file": ("test.wav", io.BytesIO(b"dummy"), "audio/wav")})
        assert res.status_code == 200
        return res.json()["consultation_id"]


def test_transcribe_unauthorized_patient(client):
    pat_token, _ = create_patient(client, "pat_unauth@t.com")
    res = client.post("/consultations/transcribe",
        headers=auth_header(pat_token),
        data={"patient_id": 1},
        files={"file": ("test.wav", io.BytesIO(b"dummy"), "audio/wav")})
    assert res.status_code == 403


@patch("routers.consultation_router.process_hybrid_transcription")
def test_transcribe_success(mock_proc, client):
    mock_proc.return_value = MOCK_TRANSCRIPTION
    doc_token, _ = create_doctor(client, "doc_ts@t.com")
    _, pat_id = create_patient(client, "pat_ts@t.com")

    res = client.post("/consultations/transcribe",
        headers=auth_header(doc_token),
        data={"patient_id": pat_id},
        files={"file": ("test.wav", io.BytesIO(b"dummy"), "audio/wav")})
    assert res.status_code == 200
    assert "consultation_id" in res.json()


def test_consultation_history(client):
    doc_token, _ = create_doctor(client, "doc_h@t.com")
    _, pat_id = create_patient(client, "pat_h@t.com")
    pat_token = client.post("/auth/login",
        data={"username": "pat_h@t.com", "password": "test_password_123"}).json()["access_token"]

    _create_consultation(client, doc_token, pat_id)

    # Doctor history
    res = client.get("/consultations/history", headers=auth_header(doc_token))
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # Patient history
    res = client.get("/consultations/history", headers=auth_header(pat_token))
    assert res.status_code == 200
    assert len(res.json()) >= 1


def test_finalize_consultation(client):
    doc_token, _ = create_doctor(client, "doc_f@t.com")
    _, pat_id = create_patient(client, "pat_f@t.com")
    cid = _create_consultation(client, doc_token, pat_id)

    res = client.post(f"/consultations/{cid}/finalize",
        headers=auth_header(doc_token),
        json={"final_revised_text": "Final text."})
    assert res.status_code == 200
    assert "pdf_url" in res.json()

    # Cannot finalize twice
    res = client.post(f"/consultations/{cid}/finalize",
        headers=auth_header(doc_token),
        json={"final_revised_text": "Again."})
    assert res.status_code == 400


@patch("routers.consultation_router.extract_medical_entities")
def test_extract_entities(mock_llm, client):
    mock_llm.return_value = {
        "Symptoms": "Headache", "Diagnosis": "Migraine",
        "Prescribed_Medication": "Ibuprofen", "Recommendations": "Rest"
    }
    doc_token, _ = create_doctor(client, "doc_e@t.com")
    _, pat_id = create_patient(client, "pat_e@t.com")
    cid = _create_consultation(client, doc_token, pat_id)

    res = client.post(f"/consultations/{cid}/extract-entities", headers=auth_header(doc_token))
    assert res.status_code == 200
    assert res.json()["entities"]["Diagnosis"] == "Migraine"


def test_get_by_id_access_control(client):
    doc_token, _ = create_doctor(client, "doc_ac@t.com")
    _, pat_id = create_patient(client, "pat_ac@t.com")
    cid = _create_consultation(client, doc_token, pat_id)

    # Doctor can view
    res = client.get(f"/consultations/{cid}", headers=auth_header(doc_token))
    assert res.status_code == 200

    # Admin can view
    admin_token = create_admin(client, "admin_ac@t.com")
    res = client.get(f"/consultations/{cid}", headers=auth_header(admin_token))
    assert res.status_code == 200

    # Another doctor cannot view
    doc2_token, _ = create_doctor(client, "doc_ac2@t.com")
    res = client.get(f"/consultations/{cid}", headers=auth_header(doc2_token))
    assert res.status_code == 403


def test_get_by_id_not_found(client):
    doc_token, _ = create_doctor(client, "doc_nf@t.com")
    res = client.get("/consultations/9999", headers=auth_header(doc_token))
    assert res.status_code == 404


def test_consultation_has_audit_fields(client):
    doc_token, _ = create_doctor(client, "doc_aud@t.com")
    _, pat_id = create_patient(client, "pat_aud@t.com")
    cid = _create_consultation(client, doc_token, pat_id)

    res = client.get(f"/consultations/{cid}", headers=auth_header(doc_token))
    data = res.json()
    assert "is_deleted" in data
    assert data["is_deleted"] is False
