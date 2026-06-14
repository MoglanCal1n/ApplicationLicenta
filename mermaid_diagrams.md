# Diagramele Platformei E-Health în format Mermaid

Acest document conține codul sursă **Mermaid** pentru toate diagramele cazurilor de utilizare (împărțite pe cele trei roluri: Pacient, Medic, Administrator) și pentru diagrama de clase ORM. 

Poți vizualiza aceste diagrame direct în orice editor de Markdown compatibil (cum ar fi VS Code cu extensia Markdown Preview Mermaid, GitHub, sau direct pe [Mermaid Live Editor](https://mermaid.live) pentru a le exporta ca imagini PNG/SVG de înaltă rezoluție pentru lucrarea ta).

---

## 1. Diagrama Cazurilor de Utilizare — Modulul Pacient

Această diagramă ilustrează interacțiunile pacientului cu platforma E-Health, evidențiind fluxul de programări și înregistrarea simptomelor pre-consult.

```mermaid
graph LR
    %% Actori
    Pacient((👤 Pacient))

    subgraph "Sistemul E-Health (Modul Pacient)"
        UC1([Gestiune Dosar Medical Personal])
        UC2([Vizualizare Medici Disponibili])
        UC3([Rezervare Programare])
        UC5([Vizualizare Istoric Consultații])
        UC6([Descărcare Raport PDF Decriptat])
        UC7([Autentificare prin Google OAuth])
    end

    %% Asocieri
    Pacient --- UC1
    Pacient --- UC2
    Pacient --- UC3
    Pacient --- UC5
    Pacient --- UC6
    Pacient --- UC7

    %% Relatii de tip Include / Extend
    UC3 -.->|<< include >>| UC2
    UC6 -.->|<< include >>| UC5

    style Pacient fill:#e0f2fe,stroke:#0369a1,stroke-width:2px;
```

---

## 2. Diagrama Cazurilor de Utilizare — Modulul Medic

Această diagramă evidențiază fluxurile clinice ale medicului, în special înregistrarea consultației, corecția cu Scorul Mixt (HITL) și finalizarea cu criptare E2EE.

```mermaid
graph LR
    %% Actori
    Medic((🩺 Medic Specialist))
    SistemAI([🧠 Sistem Hibrid AI])
    BazaDate[(🗄️ Baza de Date)]

    subgraph "Sistemul E-Health (Modul Medic)"
        UC8([Vizualizare Agenda Programări])
        UC9([Accesare Dosar Medical Pacient])
        UC10([Înregistrare Audio Consultație])
        UC11([Procesare AI & Editare WYSIWYG])
        UC12([Validare & Corecție Acustică])
        UC13([Finalizare & Criptare E2EE])
        UC14([Generare Raport PDF])
    end

    %% Asocieri
    Medic --- UC8
    Medic --- UC9
    Medic --- UC10
    Medic --- UC11
    Medic --- UC13

    %% Relații Include / Extend / Dependency
    UC9 -.->|<< extend >>| UC8
    UC11 -.->|<< include >>| UC10
    UC12 -.->|<< include >>| UC11
    UC13 -.->|<< include >>| UC12
    UC13 -.->|<< include >>| UC14

    %% Conexiuni cu Rețelele Neuronale și DB
    UC11 --- SistemAI
    UC13 --- BazaDate
    
    style Medic fill:#e0f2fe,stroke:#0369a1,stroke-width:2px;
    style SistemAI fill:#fef3c7,stroke:#d97706,stroke-width:2px;
    style BazaDate fill:#f1f5f9,stroke:#475569,stroke-width:2px;
    style UC13 fill:#ecfdf5,stroke:#059669,stroke-width:2px;
```

---

## 3. Diagrama Cazurilor de Utilizare — Modulul Administrator

Această diagramă prezintă opțiunile de mentenanță tehnică, gestiunea utilizatorilor, alocarea rolurilor de sistem și editarea administrativă.

```mermaid
graph LR
    %% Actori
    Admin((⚙️ Administrator))
    BazaDate[(🗄️ Baza de Date)]

    subgraph "Sistemul E-Health (Modul Admin)"
        UC15([Vizualizare Dashboard Admin])
        UC16([Gestiune Utilizatori])
        UC17([Modificare Roluri - Users Role])
        UC18([Adăugare Utilizator Nou])
        UC19([Editare Manuală Consultații])
        UC20([Anulare Programări Active])
    end

    %% Asocieri
    Admin --- UC15
    Admin --- UC16
    Admin --- UC17
    Admin --- UC18
    Admin --- UC19
    Admin --- UC20

    %% Relații
    UC16 -.->|<< include >>| UC15
    UC17 -.->|<< extend >>| UC16
    UC18 -.->|<< extend >>| UC16
    
    UC19 --- BazaDate
    UC20 --- BazaDate

    style Admin fill:#fee2e2,stroke:#b91c1c,stroke-width:2px;
    style BazaDate fill:#f1f5f9,stroke:#475569,stroke-width:2px;
```

---

## 4. Diagrama de Clase (Modelul de Date ORM SQLAlchemy)

Această diagramă reflectă structura de clase Python asociată tabelelor din PostgreSQL, ilustrând atributele detaliate, tipurile de date și multiplicitățile relațiilor (1:1, 1:N).

```mermaid
classDiagram
    direction TB
    
    class User {
        +int id
        +str email
        +str password_hash
        +UserRole role
        +str e2ee_public_key
        +datetime created_at
        +register_key()
    }

    class PatientProfile {
        +int id
        +int user_id
        +str cnp
        +str allergies
        +str current_medication
        +datetime date_of_birth
        +update_profile()
    }

    class DoctorProfile {
        +int id
        +int user_id
        +str license_number
        +str specialization
        +str schedule_hours
    }

    class Appointment {
        +int id
        +int patient_id
        +int doctor_id
        +datetime date
        +AppointmentStatus status
        +str anamnesis_draft_text
        +book_slot()
        +cancel()
    }

    class Consultation {
        +int id
        +int appointment_id
        +int patient_id
        +int doctor_id
        +ConsultationStatus status
        +str consult_audio_url
        +str ai_draft_transcript
        +str final_revised_text
        +str pdf_report_url
        +str encrypted_final_text
        +str encrypted_structured
        +str e2ee_iv_b64
        +str e2ee_salt_b64
        +int e2ee_sender_user_id
        +datetime created_at
        +datetime signed_at
        +finalize()
        +update()
    }

    class Notification {
        +int id
        +int user_id
        +str type
        +str title
        +str message
        +bool is_read
        +datetime created_at
        +mark_as_read()
    }

    %% Relații și Multiplicități
    User --> PatientProfile : has_patient_profile
    User --> DoctorProfile : has_doctor_profile
    User --> Notification : receives
    
    PatientProfile --> Appointment : schedules
    DoctorProfile --> Appointment : attends
    
    Appointment --> Consultation : linked_to
    PatientProfile --> Consultation : undergoes
    DoctorProfile --> Consultation : performs
```
