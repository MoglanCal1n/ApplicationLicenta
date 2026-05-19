# Comprehensive Backend Development Roadmap

To bring the E-Health platform to a fully developed, production-ready state, we need to implement several key systems. Below is a detailed plan organized by modules, along with relevant architectural questions.

## Phase 1: Appointment Management System (Scheduling)
**Objective**: Allow patients to request appointments and doctors to manage them.

**Key Features**:
- **Endpoints**: `POST /appointments/request`, `PUT /appointments/{id}/status`, `GET /appointments/me`.
- **Availability Slots**: Logic to prevent double-booking and overlapping appointments.
- **Status Workflow**: Transitions between `PENDING` -> `CONFIRMED` -> `COMPLETED` / `CANCELLED`.

> [!IMPORTANT]
> **Questions for you:**
> 1. Should doctors configure their weekly schedule (e.g., Mon-Wed 10:00-14:00) so patients can only pick from available slots, or will the system accept any requested time and leave it up to the doctor to reject/reschedule it?
> THE ANSWER HERE IS: THE SYSTEM WILL ACCEPT ANY REQUESTED TIME AND LEAVE IT UP TO THE DOCTOR TO REJECT/RESCHEDULE IT.
> 2. How long is a standard appointment? (e.g., 30 minutes, 1 hour?)
> THE ANSWER HERE IS: HALF AN HOUR.

## Phase 2: File Storage and Persistence (Audio & PDFs)
**Objective**: Persistently and securely store consultation audio and generated medical reports.

**Key Features**:
- Currently, audio files are deleted immediately after transcription. We need a permanent storage layer.
- **Secure Retrieval**: Endpoints that stream the saved audio file or return a secure URL so doctors/patients can listen to it later.
- **PDF Generation Layer**: Converting the final consultation data into a beautifully formatted, downloadable PDF medical letter/prescription.

> [!IMPORTANT]
> **Questions for you:**
> 1. How do you want to handle file storage? Should we save files locally inside a mapped Docker volume (e.g., `/app/uploads`), or do you want to integrate a cloud provider like AWS S3? (Local volumes are easier for a thesis project, S3 is better for production).
> THE ANSWER HERE IS: SAVE FILES LOCALLY INSIDE A MAPPED DOCKER VOLUME.
> 2. For the PDF generation, do you have a specific library in mind? (e.g., `ReportLab`, `WeasyPrint`, or converting HTML to PDF via `pdfkit`).
> THE ANSWER HERE IS: USE THE MOST MODERN AND EFFICIENT LIBRARY FOR PDF GENERATION,.

## Phase 3: Medical Entity Extraction (LLM Integration)
**Objective**: Automatically structure the raw transcript into distinct medical fields to save the doctor time.

**Key Features**:
- Pass the `ai_draft_transcript` through a Large Language Model.
- Extract specific JSON fields: `Symptoms`, `Diagnosis`, `Prescribed Medication`, `Recommendations`.
- Save this structured data inside the `Consultation` database model and return it to the frontend.

> [!IMPORTANT]
> **Questions for you:**
> 1. Which LLM provider should we use for this? OpenAI API (GPT-4/GPT-3.5) is the easiest, but if you want to keep medical data strictly local (for privacy reasons), we could integrate a local open-source model using Ollama.
> THE ANSWER HERE IS: OPEN-SOURCE LOCAL MODEL.

## Phase 4: Consultation Finalization Workflow
**Objective**: Give doctors control over the final document.

**Key Features**:
- **Review Endpoint**: An endpoint for doctors to manually review the AI-generated transcript, edit any remaining mistakes (if the hybrid model missed something), and finalize the text.
- **Digital Signing**: Once marked as `SIGNED`, the consultation becomes read-only, generates the PDF, and officially becomes visible to the patient.

## Phase 5: Notifications & Optimization
**Objective**: Keep users informed and ensure the API scales well.

**Key Features**:
- **Notifications**: Email alerts (using SMTP or a service like SendGrid) when an appointment is confirmed or a medical report is ready.
- **Pagination & Search**: Adding `skip`, `limit`, and search filters (by date, doctor, or keyword) to the history endpoints.

> [!IMPORTANT]
> **Questions for you:**
> 1. Do we need real-time WebSockets for notifications in the frontend, or is sending an email / having the frontend fetch updates periodically enough for this project scope?
> THE ANSWER HERE IS: WE SEND EMAIL. THE FRONTEND WILL FETCH UPDATES PERIODICALLY.

---

Please review this plan and the questions within each section. Your answers will define the exact architecture and tools we use moving forward!
