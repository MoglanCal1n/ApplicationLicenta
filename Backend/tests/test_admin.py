"""
Comprehensive tests for Admin CRUD operations on appointments and consultations.
Covers: happy paths, RBAC enforcement, soft deletes, pagination, filtering, edge cases.
"""

from datetime import datetime, timedelta
from tests.conftest import (
    create_patient, create_doctor, create_admin, auth_header,
)


def _future(days=2):
    return (datetime.now() + timedelta(days=days)).isoformat()


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN APPOINTMENT CRUD
# ══════════════════════════════════════════════════════════════════════════════

class TestAdminAppointments:

    def test_admin_create_appointment(self, client):
        admin_token = create_admin(client)
        _, pat_id = create_patient(client, "p1@t.com")
        _, doc_id = create_doctor(client, "d1@t.com")

        res = client.post("/appointments/admin/create",
            headers=auth_header(admin_token),
            json={"patient_id": pat_id, "doctor_id": doc_id,
                  "appointment_date": _future(), "status": "CONFIRMED"})
        assert res.status_code == 201
        assert res.json()["status"] == "CONFIRMED"
        assert res.json()["created_by"] is not None

    def test_admin_create_invalid_patient(self, client):
        admin_token = create_admin(client)
        _, doc_id = create_doctor(client, "d2@t.com")
        res = client.post("/appointments/admin/create",
            headers=auth_header(admin_token),
            json={"patient_id": 9999, "doctor_id": doc_id, "appointment_date": _future()})
        assert res.status_code == 404

    def test_admin_create_invalid_doctor(self, client):
        admin_token = create_admin(client)
        _, pat_id = create_patient(client, "p2@t.com")
        res = client.post("/appointments/admin/create",
            headers=auth_header(admin_token),
            json={"patient_id": pat_id, "doctor_id": 9999, "appointment_date": _future()})
        assert res.status_code == 404

    def test_admin_list_all_appointments(self, client):
        admin_token = create_admin(client)
        pat_token, _ = create_patient(client, "p3@t.com")
        _, doc_id = create_doctor(client, "d3@t.com")

        # Patient creates 3 appointments
        for i in range(3):
            client.post("/appointments/request", headers=auth_header(pat_token),
                json={"doctor_id": doc_id, "appointment_date": _future(i+1)})

        res = client.get("/appointments/admin/all", headers=auth_header(admin_token))
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3
        assert data["page"] == 1

    def test_admin_list_pagination(self, client):
        admin_token = create_admin(client)
        pat_token, _ = create_patient(client, "p4@t.com")
        _, doc_id = create_doctor(client, "d4@t.com")

        for i in range(5):
            client.post("/appointments/request", headers=auth_header(pat_token),
                json={"doctor_id": doc_id, "appointment_date": _future(i+1)})

        res = client.get("/appointments/admin/all?page=1&limit=2", headers=auth_header(admin_token))
        data = res.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["pages"] == 3

        res2 = client.get("/appointments/admin/all?page=3&limit=2", headers=auth_header(admin_token))
        assert len(res2.json()["items"]) == 1

    def test_admin_list_filter_by_status(self, client):
        admin_token = create_admin(client)
        pat_token, _ = create_patient(client, "p5@t.com")
        doc_token, doc_id = create_doctor(client, "d5@t.com")

        res = client.post("/appointments/request", headers=auth_header(pat_token),
            json={"doctor_id": doc_id, "appointment_date": _future()})
        appt_id = res.json()["id"]

        client.put(f"/appointments/{appt_id}/status", headers=auth_header(doc_token),
            json={"status": "CONFIRMED"})

        res = client.get("/appointments/admin/all?status=CONFIRMED", headers=auth_header(admin_token))
        assert res.json()["total"] == 1

        res = client.get("/appointments/admin/all?status=PENDING", headers=auth_header(admin_token))
        assert res.json()["total"] == 0

    def test_admin_update_appointment(self, client):
        admin_token = create_admin(client)
        pat_token, pat_id = create_patient(client, "p6@t.com")
        _, doc_id = create_doctor(client, "d6@t.com")

        res = client.post("/appointments/request", headers=auth_header(pat_token),
            json={"doctor_id": doc_id, "appointment_date": _future()})
        appt_id = res.json()["id"]

        new_date = _future(10)
        res = client.put(f"/appointments/admin/{appt_id}", headers=auth_header(admin_token),
            json={"status": "SCHEDULED", "appointment_date": new_date})
        assert res.status_code == 200
        assert res.json()["status"] == "SCHEDULED"

    def test_admin_update_nonexistent(self, client):
        admin_token = create_admin(client)
        res = client.put("/appointments/admin/9999", headers=auth_header(admin_token),
            json={"status": "CONFIRMED"})
        assert res.status_code == 404

    def test_admin_soft_delete_appointment(self, client):
        admin_token = create_admin(client)
        pat_token, _ = create_patient(client, "p7@t.com")
        _, doc_id = create_doctor(client, "d7@t.com")

        res = client.post("/appointments/request", headers=auth_header(pat_token),
            json={"doctor_id": doc_id, "appointment_date": _future()})
        appt_id = res.json()["id"]

        # Soft delete
        res = client.delete(f"/appointments/admin/{appt_id}", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert "soft-deleted" in res.json()["message"]

        # Not visible in normal listing
        res = client.get("/appointments/admin/all", headers=auth_header(admin_token))
        assert res.json()["total"] == 0

        # Visible with include_deleted
        res = client.get("/appointments/admin/all?include_deleted=true", headers=auth_header(admin_token))
        assert res.json()["total"] == 1

    def test_admin_soft_delete_nonexistent(self, client):
        admin_token = create_admin(client)
        res = client.delete("/appointments/admin/9999", headers=auth_header(admin_token))
        assert res.status_code == 404

    def test_admin_view_appointment_by_id(self, client):
        admin_token = create_admin(client)
        pat_token, _ = create_patient(client, "p8@t.com")
        _, doc_id = create_doctor(client, "d8@t.com")

        res = client.post("/appointments/request", headers=auth_header(pat_token),
            json={"doctor_id": doc_id, "appointment_date": _future()})
        appt_id = res.json()["id"]

        res = client.get(f"/appointments/{appt_id}", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert res.json()["id"] == appt_id


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN CONSULTATION CRUD
# ══════════════════════════════════════════════════════════════════════════════

class TestAdminConsultations:

    def test_admin_create_consultation(self, client):
        admin_token = create_admin(client)
        _, pat_id = create_patient(client, "cp1@t.com")
        _, doc_id = create_doctor(client, "cd1@t.com")

        res = client.post("/admin/consultations", headers=auth_header(admin_token),
            json={"patient_id": pat_id, "doctor_id": doc_id,
                  "ai_draft_transcript": "Test transcript."})
        assert res.status_code == 201
        assert res.json()["status"] == "DRAFT"
        assert res.json()["ai_draft_transcript"] == "Test transcript."

    def test_admin_create_invalid_patient(self, client):
        admin_token = create_admin(client)
        _, doc_id = create_doctor(client, "cd2@t.com")
        res = client.post("/admin/consultations", headers=auth_header(admin_token),
            json={"patient_id": 9999, "doctor_id": doc_id})
        assert res.status_code == 404

    def test_admin_create_invalid_doctor(self, client):
        admin_token = create_admin(client)
        _, pat_id = create_patient(client, "cp2@t.com")
        res = client.post("/admin/consultations", headers=auth_header(admin_token),
            json={"patient_id": pat_id, "doctor_id": 9999})
        assert res.status_code == 404

    def test_admin_list_all_consultations(self, client):
        admin_token = create_admin(client)
        _, pat_id = create_patient(client, "cp3@t.com")
        _, doc_id = create_doctor(client, "cd3@t.com")

        for _ in range(3):
            client.post("/admin/consultations", headers=auth_header(admin_token),
                json={"patient_id": pat_id, "doctor_id": doc_id})

        res = client.get("/admin/consultations", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert res.json()["total"] == 3

    def test_admin_list_pagination(self, client):
        admin_token = create_admin(client)
        _, pat_id = create_patient(client, "cp4@t.com")
        _, doc_id = create_doctor(client, "cd4@t.com")

        for _ in range(5):
            client.post("/admin/consultations", headers=auth_header(admin_token),
                json={"patient_id": pat_id, "doctor_id": doc_id})

        res = client.get("/admin/consultations?page=1&limit=2", headers=auth_header(admin_token))
        data = res.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["pages"] == 3

    def test_admin_list_filter_by_status(self, client):
        admin_token = create_admin(client)
        _, pat_id = create_patient(client, "cp5@t.com")
        _, doc_id = create_doctor(client, "cd5@t.com")

        client.post("/admin/consultations", headers=auth_header(admin_token),
            json={"patient_id": pat_id, "doctor_id": doc_id, "status": "DRAFT"})
        client.post("/admin/consultations", headers=auth_header(admin_token),
            json={"patient_id": pat_id, "doctor_id": doc_id, "status": "SIGNED"})

        res = client.get("/admin/consultations?status=DRAFT", headers=auth_header(admin_token))
        assert res.json()["total"] == 1

    def test_admin_get_consultation_by_id(self, client):
        admin_token = create_admin(client)
        _, pat_id = create_patient(client, "cp6@t.com")
        _, doc_id = create_doctor(client, "cd6@t.com")

        res = client.post("/admin/consultations", headers=auth_header(admin_token),
            json={"patient_id": pat_id, "doctor_id": doc_id})
        cid = res.json()["id"]

        res = client.get(f"/admin/consultations/{cid}", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert res.json()["id"] == cid

    def test_admin_get_nonexistent_consultation(self, client):
        admin_token = create_admin(client)
        res = client.get("/admin/consultations/9999", headers=auth_header(admin_token))
        assert res.status_code == 404

    def test_admin_update_consultation(self, client):
        admin_token = create_admin(client)
        _, pat_id = create_patient(client, "cp7@t.com")
        _, doc_id = create_doctor(client, "cd7@t.com")

        res = client.post("/admin/consultations", headers=auth_header(admin_token),
            json={"patient_id": pat_id, "doctor_id": doc_id})
        cid = res.json()["id"]

        res = client.put(f"/admin/consultations/{cid}", headers=auth_header(admin_token),
            json={"status": "SIGNED", "final_revised_text": "Admin edited."})
        assert res.status_code == 200
        assert res.json()["status"] == "SIGNED"
        assert res.json()["final_revised_text"] == "Admin edited."
        assert res.json()["signed_at"] is not None

    def test_admin_update_nonexistent(self, client):
        admin_token = create_admin(client)
        res = client.put("/admin/consultations/9999", headers=auth_header(admin_token),
            json={"status": "SIGNED"})
        assert res.status_code == 404

    def test_admin_soft_delete_consultation(self, client):
        admin_token = create_admin(client)
        _, pat_id = create_patient(client, "cp8@t.com")
        _, doc_id = create_doctor(client, "cd8@t.com")

        res = client.post("/admin/consultations", headers=auth_header(admin_token),
            json={"patient_id": pat_id, "doctor_id": doc_id})
        cid = res.json()["id"]

        res = client.delete(f"/admin/consultations/{cid}", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert "soft-deleted" in res.json()["message"]

        # Hidden from normal list
        res = client.get("/admin/consultations", headers=auth_header(admin_token))
        assert res.json()["total"] == 0

        # Visible with include_deleted
        res = client.get("/admin/consultations?include_deleted=true", headers=auth_header(admin_token))
        assert res.json()["total"] == 1

    def test_admin_soft_delete_nonexistent(self, client):
        admin_token = create_admin(client)
        res = client.delete("/admin/consultations/9999", headers=auth_header(admin_token))
        assert res.status_code == 404

    def test_admin_stats(self, client):
        admin_token = create_admin(client)
        res = client.get("/admin/stats", headers=auth_header(admin_token))
        assert res.status_code == 200
        data = res.json()
        assert "total_users" in data
        assert "total_patients" in data
        assert "total_doctors" in data


# ══════════════════════════════════════════════════════════════════════════════
# RBAC — Non-admins blocked from admin endpoints
# ══════════════════════════════════════════════════════════════════════════════

class TestAdminRBAC:

    def test_patient_blocked_from_admin_appointments(self, client):
        pat_token, _ = create_patient(client, "rbac_p@t.com")
        res = client.get("/appointments/admin/all", headers=auth_header(pat_token))
        assert res.status_code == 403

    def test_doctor_blocked_from_admin_appointments(self, client):
        doc_token, _ = create_doctor(client, "rbac_d@t.com")
        res = client.get("/appointments/admin/all", headers=auth_header(doc_token))
        assert res.status_code == 403

    def test_patient_blocked_from_admin_consultations(self, client):
        pat_token, _ = create_patient(client, "rbac_p2@t.com")
        res = client.get("/admin/consultations", headers=auth_header(pat_token))
        assert res.status_code == 403

    def test_doctor_blocked_from_admin_consultations(self, client):
        doc_token, _ = create_doctor(client, "rbac_d2@t.com")
        res = client.get("/admin/consultations", headers=auth_header(doc_token))
        assert res.status_code == 403

    def test_patient_blocked_from_admin_create_appt(self, client):
        pat_token, _ = create_patient(client, "rbac_p3@t.com")
        res = client.post("/appointments/admin/create", headers=auth_header(pat_token),
            json={"patient_id": 1, "doctor_id": 1, "appointment_date": _future()})
        assert res.status_code == 403

    def test_patient_blocked_from_admin_delete_appt(self, client):
        pat_token, _ = create_patient(client, "rbac_p4@t.com")
        res = client.delete("/appointments/admin/1", headers=auth_header(pat_token))
        assert res.status_code == 403

    def test_doctor_blocked_from_admin_create_consultation(self, client):
        doc_token, _ = create_doctor(client, "rbac_d3@t.com")
        res = client.post("/admin/consultations", headers=auth_header(doc_token),
            json={"patient_id": 1, "doctor_id": 1})
        assert res.status_code == 403

    def test_doctor_blocked_from_admin_delete_consultation(self, client):
        doc_token, _ = create_doctor(client, "rbac_d4@t.com")
        res = client.delete("/admin/consultations/1", headers=auth_header(doc_token))
        assert res.status_code == 403

    def test_unauthenticated_blocked_from_admin(self, client):
        res = client.get("/appointments/admin/all")
        assert res.status_code == 401
        res = client.get("/admin/consultations")
        assert res.status_code == 401

    def test_admin_blocked_from_patient_request(self, client):
        admin_token = create_admin(client, "rbac_a@t.com")
        res = client.post("/appointments/request", headers=auth_header(admin_token),
            json={"doctor_id": 1, "appointment_date": _future()})
        assert res.status_code == 403
