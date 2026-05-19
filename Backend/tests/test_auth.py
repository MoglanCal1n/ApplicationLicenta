"""Tests for authentication endpoints: register, login, role enforcement."""

from tests.conftest import register_user, login_user, auth_header, ADMIN_SECRET


def test_register_patient_success(client):
    response = client.post("/auth/register", json={
        "email": "pacient@test.com",
        "password": "parola_sigura_123",
        "role": "PATIENT"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "pacient@test.com"
    assert data["role"] == "PATIENT"


def test_register_doctor_without_code_fails(client):
    response = client.post("/auth/register", json={
        "email": "doctor@test.com",
        "password": "parola_sigura_123",
        "role": "DOCTOR"
    })
    assert response.status_code == 403


def test_register_admin_without_code_fails(client):
    response = client.post("/auth/register", json={
        "email": "admin@test.com",
        "password": "parola_sigura_123",
        "role": "ADMIN"
    })
    assert response.status_code == 403


def test_register_admin_with_code_succeeds(client):
    response = client.post("/auth/register", json={
        "email": "admin@test.com",
        "password": "parola_sigura_123",
        "role": "ADMIN",
        "admin_code": ADMIN_SECRET
    })
    assert response.status_code == 201
    assert response.json()["role"] == "ADMIN"


def test_login_success_returns_token(client):
    register_user(client, "login@test.com", "PATIENT")
    response = client.post("/auth/login", data={
        "username": "login@test.com",
        "password": "test_password_123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"


def test_login_wrong_password_fails(client):
    register_user(client, "login2@test.com", "PATIENT")
    response = client.post("/auth/login", data={
        "username": "login2@test.com",
        "password": "wrong_password"
    })
    assert response.status_code == 401


def test_login_nonexistent_user_fails(client):
    response = client.post("/auth/login", data={
        "username": "ghost@test.com",
        "password": "test"
    })
    assert response.status_code == 401


def test_duplicate_email_fails(client):
    register_user(client, "dup@test.com", "PATIENT")
    response = client.post("/auth/register", json={
        "email": "dup@test.com",
        "password": "another_password",
        "role": "PATIENT"
    })
    assert response.status_code == 400


def test_me_endpoint(client):
    register_user(client, "me@test.com", "PATIENT")
    token = login_user(client, "me@test.com")
    response = client.get("/auth/me", headers=auth_header(token))
    assert response.status_code == 200
    assert response.json()["email"] == "me@test.com"


def test_me_without_token_fails(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_logout(client):
    register_user(client, "logout@test.com", "PATIENT")
    token = login_user(client, "logout@test.com")
    response = client.post("/auth/logout", headers=auth_header(token))
    assert response.status_code == 200