import os
import httpx
import json
import logging

logger = logging.getLogger(__name__)

# Default to the Docker service name for inter-container networking
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434/api/generate")
MODEL_NAME = os.getenv("OLLAMA_MODEL", "phi3")

# ── Structured extraction system prompt ───────────────────────────────────────
# Placed in the "system" field so Ollama treats it as a persistent behavioral
# instruction, separate from the per-request user prompt.
_EXTRACTION_SYSTEM_PROMPT = (
    "You are a medical AI assistant specialized in structuring clinical consultation transcripts. "
    "Your ONLY task is to extract and organize facts that are EXPLICITLY stated in the transcript. "
    "You must NEVER infer, assume, diagnose, or add any information that is not directly present in the text. "
    "You must NEVER omit any clinical fact present in the transcript. "
    "Preserve the original language of the transcript (Romanian or English). "
    "If a field cannot be determined from the transcript, use an empty string."
)

_EDITING_SYSTEM_PROMPT = (
    "You are an expert medical transcriptionist. "
    "Your ONLY task is to correct grammar, fix punctuation, and format text into readable paragraphs. "
    "You must NEVER add, remove, or change any medical facts, diagnoses, medication names, or clinical information. "
    "You must NEVER hallucinate or invent content. "
    "Preserve the original language (Romanian or English). "
    "If the text contains HTML tags (e.g., <span style='color: red...'>) you MUST preserve them exactly as they are."
)

# Keys returned by Ollama → internal field names used by the PDF template
_KEY_MAP = {
    "Symptoms":              "symptoms",
    "Diagnosis":             "diagnosis",
    "Recommendations":       "recommendations",
    "Prescribed_Medication": "prescriptions",
}

_FALLBACK = {
    "symptoms":        "",
    "diagnosis":       "",
    "recommendations": "",
    "prescriptions":   "",
}

# Valid keys that the Ollama response MUST contain
_REQUIRED_KEYS = set(_KEY_MAP.keys())


def _validate_extraction(raw: dict) -> dict:
    """
    Validates and normalizes the raw Ollama JSON response.
    Ensures all required keys exist and all values are strings.
    Strips any unexpected keys to prevent data leakage.
    """
    result = {}
    for ollama_key, internal_key in _KEY_MAP.items():
        value = raw.get(ollama_key, "")
        # Coerce non-string values (lists, dicts, numbers) into strings
        if isinstance(value, list):
            value = "; ".join(str(item) for item in value)
        elif not isinstance(value, str):
            value = str(value) if value is not None else ""
        result[internal_key] = value.strip()
    return result


def extract_structured_fields(transcript: str) -> dict:
    """
    Calls the local Ollama model and asks it to extract structured medical
    fields from a consultation transcript.

    Returns a dict with keys:
        symptoms, diagnosis, recommendations, prescriptions
    All values are strings. Falls back to empty strings if Ollama is
    unavailable so the flow is never blocked.

    Uses temperature=0 and a dedicated system prompt to enforce strict
    factual fidelity — the model must map, not interpret.
    """
    prompt = f"""Analyze the following medical consultation transcript.
Extract and map the content into exactly these four JSON keys:
  "Symptoms"              - the main symptoms or chief complaint reported by the patient
  "Diagnosis"             - the clinical diagnosis or suspected diagnosis stated by the doctor
  "Recommendations"       - lifestyle advice, follow-up instructions, referrals mentioned
  "Prescribed_Medication" - drug names, dosages, frequency, and duration mentioned

Rules:
- Return ONLY a raw JSON object. No markdown, no explanation, no preamble.
- Copy the relevant phrases from the transcript as-is. Do NOT paraphrase or summarize.
- If a field has no corresponding information in the transcript, use an empty string.

Transcript:
\"\"\"{transcript}\"\"\""""

    try:
        response = httpx.post(
            OLLAMA_URL,
            json={
                "model":  MODEL_NAME,
                "system": _EXTRACTION_SYSTEM_PROMPT,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0,       # Deterministic — no creativity
                    "top_p":       1.0,      # No nucleus sampling
                    "top_k":       1,        # Greedy decoding
                },
            },
            timeout=120.0,   # LLM can be slow on first run
        )
        response.raise_for_status()
        raw = json.loads(response.json()["response"])

        # Validate and normalize the response structure
        return _validate_extraction(raw)

    except json.JSONDecodeError as e:
        logger.error(f"[llm_service] Ollama returned invalid JSON: {e}")
        return _FALLBACK.copy()
    except httpx.HTTPStatusError as e:
        logger.error(f"[llm_service] Ollama HTTP error {e.response.status_code}: {e}")
        return _FALLBACK.copy()
    except Exception as e:
        logger.error(f"[llm_service] Ollama call failed: {e}")
        return _FALLBACK.copy()


# ── Legacy helper kept for backward compat (used by /extract-entities route) ──
def extract_medical_entities(text: str) -> dict:
    """Legacy wrapper — returns the raw Ollama JSON as-is."""
    prompt = f"""You are a medical AI assistant. Analyze the following consultation transcript and extract the medical entities in strict JSON format.
Do not output any markdown formatting or explanations, just the JSON.
The JSON should have exactly these string keys: "Symptoms", "Diagnosis", "Prescribed_Medication", "Recommendations".

Transcript: \"{text}\"
"""
    try:
        response = httpx.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0},
            },
            timeout=60.0,
        )
        response.raise_for_status()
        return json.loads(response.json()["response"])
    except Exception as e:
        logger.error(f"[llm_service] Error calling Ollama LLM: {e}")
        return {
            "Symptoms":              "Extraction failed or Ollama not running",
            "Diagnosis":             "Extraction failed",
            "Prescribed_Medication": "Extraction failed",
            "Recommendations":       "Extraction failed",
        }


def edit_transcript_with_llm(text: str) -> str:
    """
    Uses Ollama to proofread and format the raw transcription into
    a professional medical text.

    Uses temperature=0 to prevent the model from altering clinical facts.
    """
    if not text.strip():
        return ""

    prompt = f"""I will provide you with a raw, unedited voice-to-text transcript of a medical consultation.
Your task is to:
1. Correct any grammatical errors and fix punctuation.
2. Properly format it into readable paragraphs.
3. IMPORTANT: Some words in the transcript might be wrapped in HTML tags (e.g., <span style='color: red...'). You MUST preserve these HTML tags exactly as they are around the words they enclose, even if you correct the word inside.

Do NOT add any new information. Keep the original language (Romanian or English).
Output ONLY the corrected text without any introductory remarks.

Raw transcript:
\"{text}\""""

    try:
        response = httpx.post(
            OLLAMA_URL,
            json={
                "model":  MODEL_NAME,
                "system": _EDITING_SYSTEM_PROMPT,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0,       # No creative liberty
                    "top_p":       1.0,
                    "top_k":       1,
                },
            },
            timeout=120.0,
        )
        response.raise_for_status()
        raw = response.json()["response"]
        return raw.strip()
    except Exception as e:
        logger.error(f"[llm_service] Ollama text editing failed: {e}")
        return text  # Fallback to the unedited text if Ollama fails
