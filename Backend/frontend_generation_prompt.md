# Frontend Development Prompt for E-Health Platform

## Context
You are an expert Frontend Developer tasked with building a modern, responsive, and highly polished web application for an E-Health Platform. 
The backend API is fully developed using FastAPI and exposes RESTful endpoints with JWT-based authentication. The platform focuses on AI-powered medical transcriptions and appointment scheduling.

## Recommended Tech Stack
- **Framework**: React (using Vite) or Next.js.
- **Styling**: Tailwind CSS (for rapid, modern UI) + Shadcn UI or Radix UI for accessible components.
- **API Communication**: Axios + React Query (highly recommended for caching and state management).
- **Routing**: React Router (if using Vite) or Next.js App Router.

## Application Structure & Roles

### 1. Public & Auth
- **Landing Page**: A beautiful hero section explaining the AI-powered medical transcription and appointment system.
- **Authentication**: 
  - Login Page.
  - Register Page (Tabs/Toggle for Patient vs. Doctor). *Note: Doctor registration requires a specific `admin_code`.*

### 2. Patient Portal
- **Dashboard**: Shows statistics (upcoming appointments, total past consultations).
- **My Profile**: View and edit CNP, allergies, current medication, and medical history.
- **Appointments Module**: 
  - Request a new appointment (Select doctor and date).
  - View the status of requested appointments (PENDING, CONFIRMED, REJECTED).
- **Consultation History**: View past finalized consultations and download the generated PDF medical reports.

### 3. Doctor Portal (Core Features)
- **Dashboard**: Statistics (pending appointments, total patients, signed consultations).
- **My Profile**: Update specialization and license number.
- **Appointments Management**: Table/Kanban view to Approve, Reject, or Reschedule patient requests.
- **Active Consultation Studio (The AI Feature)**:
  - Interface to upload or directly record audio (`.wav`) from the browser.
  - Upload the audio to `/consultations/transcribe`.
  - Display the generated AI draft transcript.
  - Button to "Extract Medical Entities" (calls the LLM service to structure Symptoms, Diagnosis, Treatment).
  - A Rich Text Editor to manually correct the draft.
  - "Finalize & Sign" button to lock the consultation and generate the PDF.
- **Consultation History**: View all past consultations and read the PDFs.

### 4. Admin Portal
- Simple dashboard showing platform metrics (total doctors, patients, and consultations).
- List all users and doctors with a "Delete", "Update" action.
- List all consultations and appointments with a "Delete", "Update" action.
---

> [!IMPORTANT]  
> **Questions to clarify before writing code:**
> 
> 1. **Framework & Styling**: Ești de acord să folosim React + Vite + Tailwind CSS? Este cel mai rapid și modern mod de a construi interfețe uimitoare astăzi. RASPUNS: DA
> 2. **Înregistrarea Audio**: Vrei ca doctorul să poată înregistra audio direct din browser (folosind microfonul), sau va încărca mereu un fișier `.wav` gata înregistrat de pe calculator? (Recomand înregistrarea direct în browser pentru un efect "WOW"). RASPUNS: INREGISTRAT DIRECT IN BROWSER
> 3. **Lista de Medici**: Momentan, pacientul trebuie să știe `doctor_id`-ul pentru a face o programare. Vrei să construim o pagină de "Găsește un Medic" unde pacientul vede toți medicii din sistem și apasă pe "Programează-te"? RASPUNS: PAGINA DE GASESTE UN MEDIC DUPA NUME / SPECIALIZARE
> 4. **Stocarea Token-ului JWT**: Preferi să salvăm token-ul în `localStorage` (mai simplu de implementat) sau în cookies `HttpOnly` (mai securizat, dar necesită mici modificări pe backend)? *Pentru licență, `localStorage` este de obicei perfect acceptabil.* RASPUNS: IN COOKIES - facem modificarile pe backend
> 5. **Design Language**: Preferi un design specific medical (culori curate, mult alb, accente de albastru/verde deschis) sau preferi suport pentru Dark Mode modern? RASPUNS: Paleta de culori sa aibe rosu si alb, DAR VREAU SI SUPORT PENTRU DARKMODE

## Integration Details
- **API Base URL**: `http://localhost:8000` (Configure an Axios interceptor to automatically attach the `Bearer {token}` to all requests).
- **Static Files**: PDFs and Audio files are served statically from `http://localhost:8000/static/pdf/...` and `http://localhost:8000/static/audio/...`.

**Instruction for the AI**: Start by initializing the project framework, configuring Tailwind, setting up the Axios client, and proposing the routing structure.
