import os
from fpdf import FPDF
from datetime import datetime

FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts")


def _latin(text: str) -> str:
    """Strips non-latin-1 characters to avoid encoding issues with Helvetica."""
    if not text:
        return ""
    return text.encode("latin-1", "replace").decode("latin-1")


# ─── Shared base class ────────────────────────────────────────────────────────
class _BaseMedicalPDF(FPDF):
    def header(self):
        self.set_fill_color(37, 99, 235)
        self.rect(0, 0, 210, 22, style="F")
        self.set_y(4)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(255, 255, 255)
        self.cell(0, 14, "E-Health AI - Medical Consultation Report", align="C")
        self.set_text_color(0, 0, 0)
        self.set_y(28)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(
            0, 10,
            f"Electronically signed  |  Page {self.page_no()}  |  E-Health AI Platform",
            align="C"
        )
        self.set_text_color(0, 0, 0)

    def _section_title(self, title: str):
        self.set_font("Helvetica", "B", 11)
        self.set_fill_color(37, 99, 235)
        self.set_text_color(255, 255, 255)
        self.cell(0, 8, f"  {_latin(title)}", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(0, 0, 0)
        self.ln(2)

    def _body_text(self, text: str):
        self.set_font("Helvetica", "", 10)
        self.multi_cell(0, 6, _latin(text))
        self.ln(4)

    def _field_row(self, label: str, value: str):
        """Renders a labeled field with a light grey box."""
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(100, 116, 139)
        self.cell(0, 5, _latin(label.upper()), new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(0, 0, 0)
        self.set_font("Helvetica", "", 10)
        self.set_fill_color(248, 250, 252)
        self.set_draw_color(226, 232, 240)
        # Draw a rounded-style box (FPDF doesn't support border-radius, so we use FD rect)
        box_h = max(10, len(_latin(value)) // 80 * 6 + 12)
        self.rect(self.get_x(), self.get_y(), 190, box_h, style="FD")
        self.set_xy(self.get_x() + 4, self.get_y() + 3)
        self.multi_cell(182, 6, _latin(value or "—"))
        self.ln(6)

    def _meta_block(self, date: datetime, doctor_name: str, doctor_license: str,
                    doctor_spec: str, patient_name: str, patient_cnp: str):
        self.set_font("Helvetica", "B", 10)
        self.set_fill_color(241, 245, 249)
        self.set_draw_color(203, 213, 225)
        self.rect(10, self.get_y(), 190, 36, style="FD")
        y = self.get_y() + 4

        # Row 1 labels
        self.set_xy(14, y)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(100, 116, 139)
        self.cell(47, 4, "DATE")
        self.cell(47, 4, "DOCTOR")
        self.cell(47, 4, "LICENSE")
        self.cell(47, 4, "SPECIALIZATION")
        self.ln(5)
        # Row 1 values
        self.set_x(14)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(15, 23, 42)
        self.cell(47, 5, _latin(date.strftime("%d %b %Y, %H:%M")))
        self.cell(47, 5, _latin(doctor_name))
        self.cell(47, 5, _latin(doctor_license))
        self.cell(47, 5, _latin(doctor_spec))
        self.ln(7)

        # Row 2 labels
        self.set_x(14)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(100, 116, 139)
        self.cell(95, 4, "PATIENT NAME")
        self.cell(95, 4, "PATIENT CNP / ID")
        self.ln(5)
        # Row 2 values
        self.set_x(14)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(15, 23, 42)
        self.cell(95, 5, _latin(patient_name))
        self.cell(95, 5, _latin(patient_cnp))
        self.ln(10)

    def _signature_block(self, doctor_name: str):
        self.ln(10)
        self.set_draw_color(203, 213, 225)
        self.line(120, self.get_y(), 200, self.get_y())
        self.set_x(120)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(100, 116, 139)
        self.cell(80, 5, _latin(f"Dr. {doctor_name}"), align="C")


# ─── Structured PDF (new template) ───────────────────────────────────────────
def generate_structured_pdf(
    consultation_id: int,
    patient_cnp: str,
    patient_name: str,
    doctor_name: str,
    doctor_license: str,
    doctor_specialization: str,
    symptoms: str,
    diagnosis: str,
    recommendations: str,
    prescriptions: str,
    notes: str,
    date: datetime
) -> str:
    """Generates a structured, field-based PDF report. Returns the filename."""
    pdf_dir = "uploads/pdf"
    os.makedirs(pdf_dir, exist_ok=True)
    filename = f"report_{consultation_id}.pdf"
    file_path = os.path.join(pdf_dir, filename)

    pdf = _BaseMedicalPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Meta block
    pdf._meta_block(date, doctor_name, doctor_license, doctor_specialization, patient_name, patient_cnp)
    pdf.ln(4)

    # ── Section: Symptoms ──────────────────────────────────────────────────
    pdf._section_title("Symptoms / Chief Complaint")
    pdf._field_row("", symptoms or "")
    pdf.ln(2)

    # ── Section: Diagnosis ────────────────────────────────────────────────
    pdf._section_title("Diagnosis")
    pdf._field_row("", diagnosis or "")
    pdf.ln(2)

    # ── Section: Recommendations ──────────────────────────────────────────
    pdf._section_title("Recommendations")
    pdf._field_row("", recommendations or "")
    pdf.ln(2)

    # ── Section: Prescriptions ────────────────────────────────────────────
    pdf._section_title("Prescriptions")
    pdf._field_row("", prescriptions or "")
    pdf.ln(2)

    # ── Section: Additional Notes (transcript) ────────────────────────────
    if notes and notes.strip():
        pdf._section_title("Consultation Notes (AI Transcript)")
        pdf._body_text(notes)

    # Signature
    pdf._signature_block(doctor_name)

    pdf.output(file_path)
    return filename


# ─── Legacy plain-text PDF (kept for any existing usages) ────────────────────
def generate_consultation_pdf(
    consultation_id: int,
    patient_cnp: str,
    doctor_name: str,
    final_text: str,
    date: datetime
) -> str:
    """Generates a plain-text PDF report (legacy). Returns the filename."""
    pdf_dir = "uploads/pdf"
    os.makedirs(pdf_dir, exist_ok=True)
    filename = f"report_{consultation_id}.pdf"
    file_path = os.path.join(pdf_dir, filename)

    pdf = _BaseMedicalPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Minimal meta block
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(241, 245, 249)
    pdf.set_draw_color(203, 213, 225)
    pdf.rect(10, pdf.get_y(), 190, 24, style="FD")
    y = pdf.get_y() + 4
    pdf.set_xy(14, y)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(60, 5, "DATE")
    pdf.cell(60, 5, "DOCTOR LICENSE")
    pdf.cell(60, 5, "PATIENT CNP")
    pdf.ln(6)
    pdf.set_x(14)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(60, 5, _latin(date.strftime("%d %b %Y, %H:%M")))
    pdf.cell(60, 5, _latin(doctor_name))
    pdf.cell(60, 5, _latin(patient_cnp))
    pdf.ln(14)

    pdf._section_title("Consultation Notes")
    pdf._body_text(final_text)
    pdf._signature_block(doctor_name)

    pdf.output(file_path)
    return filename
