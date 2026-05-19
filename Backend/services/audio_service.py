import whisper
from transformers import pipeline
import librosa
import numpy as np
import pickle
import os
import re
import jellyfish
import subprocess
import tempfile

FINETUNED_MODEL_PATH = "HybridSystem/Finetuning/WhisperMedsynFinetunedExperiment/checkpoint-500"

print(f"Loading FINETUNED model from: {FINETUNED_MODEL_PATH}")
pipe = None
model = None

try:
    if not os.path.exists(FINETUNED_MODEL_PATH):
        print(f"Model at path {FINETUNED_MODEL_PATH} was not found. Falling back to the 'base' model via OpenAI Whisper.")
        model = whisper.load_model("base")
    else:
        print("Initializing HuggingFace pipeline for the finetuned model...")
        pipe = pipeline(
            "automatic-speech-recognition",
            model=FINETUNED_MODEL_PATH,
            tokenizer="openai/whisper-base",
            chunk_length_s=30,
            device="cpu", # Will run on CPU in Docker
            return_timestamps="word"
        )
        print("HuggingFace pipeline loaded successfully!")
except Exception as e:
    print(f"Error loading the model: {e}. Falling back to the 'base' model via OpenAI Whisper.")
    model = whisper.load_model("base")
    pipe = None
    print("Whisper 'base' model loaded successfully!")

class MedicalCorrector:
    def __init__(self, db_path: str = "services/medical_mfcc.pkl"):
        self.db_path = db_path
        self.medical_db = self._load_db()
        self.known_terms = list(self.medical_db.keys())
        
        # Updated stop-words from final analysis
        self.ignore_words = {
            "action", "added", "addition", "trusted", "epidural", "intraocular", 
            "hypo", "hyperactivity", "novo", "nordisk", "la", "sr", "md", "ct", 
            "plus", "tab", "inj", "infection", "infections", "hydrochloride", 
            "disease", "treatment", "improve", "blood", "pressure", "severe",
            "hypertensive", "dixifes", "inderide", "important", "professional", 
            "professionals", "respiratory", "improving", "improved", "parasitic", 
            "parasites", "procedures", "properties", "solution", "clinical", 
            "purposes", "recovery", "rheumatoid", "dispertab", "zentoclav", 
            "impromox", "clox", "an", "doctor", "injection", "pain", "instructions", 
            "condition", "plan", "consider", "inflammation", "certain", "angina", 
            "serious", "maintain", "production"
        }
        self.dtw_threshold = 0.15
        
    def _load_db(self) -> dict:
        if os.path.exists(self.db_path):
            with open(self.db_path, 'rb') as f:
                return pickle.load(f)
        print(f"WARNING: DB {self.db_path} not found!")
        return {}

    def check_acoustic_match(self, audio_segment: np.ndarray, sr: int, candidate_term: str) -> float:
        """
        Calculates the Dynamic Time Warping (DTW) distance between the given audio segment
        and the reference MFCCs of a candidate medical term.
        """
        ref_mfcc = self.medical_db.get(candidate_term)
        # Protection for audio segments that are too small or missing reference
        if ref_mfcc is None or len(audio_segment) < 1000:
            return float('inf')

        seg_mfcc = librosa.feature.mfcc(y=audio_segment, sr=sr, n_mfcc=13)
        # ref_mfcc.T handles cases where dimensions were saved transposed
        Y_ref = ref_mfcc.T if ref_mfcc.shape[0] != 13 else ref_mfcc
        D, wp = librosa.sequence.dtw(X=seg_mfcc, Y=Y_ref, metric='cosine')
        
        return D[-1, -1] / len(wp)

    def correct_word(self, word_text: str, audio_segment: np.ndarray, sr: int = 16000) -> str:
        """
        Corrects a transcribed word by comparing its acoustic features against 
        known medical terms using DTW and string similarity.
        """
        clean_word = re.sub(r'[^\w\s]', '', word_text).lower().strip()
        
        if not clean_word:
            return word_text
            
        base_word = clean_word[:-1] if clean_word.endswith('s') else clean_word

        # FILTER 1: Do not attempt to correct stop-words or very short words
        if len(clean_word) < 4 or clean_word in self.ignore_words or base_word in self.ignore_words:
            return word_text

        # If it's already a known term, no correction needed
        if clean_word in self.known_terms or base_word in self.known_terms:
            return word_text

        best_match = None
        min_dtw_dist = self.dtw_threshold
        
        for medical_term in self.known_terms:
            # FILTER 2: Strict length tolerance to avoid unnecessary comparisons (max 3 letters difference)
            if abs(len(clean_word) - len(medical_term)) > 3:
                continue

            # FILTER 3: Jaro-Winkler string similarity threshold
            if jellyfish.jaro_winkler_similarity(clean_word, medical_term.lower()) > 0.82:
                dtw_dist = self.check_acoustic_match(audio_segment, sr, medical_term)
                
                if dtw_dist < min_dtw_dist:
                    min_dtw_dist = dtw_dist
                    best_match = medical_term
        
        if best_match:
            return best_match
            
        return word_text

corrector = MedicalCorrector()

def process_hybrid_transcription(file_path: str) -> dict:
    """
    Processes the audio file using the hybrid model (Whisper + DTW validation)
    and generates the corrected text alongside HTML formatting for frontend display.
    Converts to WAV first via ffmpeg for maximum compatibility.
    """
    # Convert input (webm/any format) to a clean 16kHz mono WAV for Whisper + librosa
    wav_path = file_path + "_converted.wav"
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", file_path, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav_path],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        processing_path = wav_path
    except Exception as e:
        print(f"ffmpeg conversion failed: {e}, using original file.")
        processing_path = file_path

    try:
        if pipe is not None:
            # Using HuggingFace finetuned pipeline
            print("Transcribing with finetuned HuggingFace model...")
            hf_result = pipe(processing_path, generate_kwargs={"language": "english"})
            # Convert HuggingFace format to OpenAI whisper format so the loop below works
            # HF format: {"text": "...", "chunks": [{"text": "word", "timestamp": [start, end]}, ...]}
            # OpenAI format: {"segments": [{"words": [{"word": "word", "start": start, "end": end}]}]}
            segments = []
            for chunk in hf_result.get("chunks", []):
                text = chunk.get("text", "")
                ts = chunk.get("timestamp", [0.0, 0.0])
                if len(ts) == 2 and ts[0] is not None and ts[1] is not None:
                    segments.append({"words": [{"word": text, "start": ts[0], "end": ts[1]}]})
            result = {"segments": segments}
        else:
            # Using OpenAI whisper base model
            print("Transcribing with OpenAI whisper base model...")
            result = model.transcribe(processing_path, language="english", fp16=False, word_timestamps=True)
            
        audio, sr = librosa.load(processing_path, sr=16000)
    finally:
        # Clean up the converted WAV
        if os.path.exists(wav_path):
            os.remove(wav_path)

    plain_text = []
    html_text = []
    corrections_log = []
    
    for segment in result.get('segments', []):
        for word_info in segment.get('words', []):
            original_word = word_info['word'].strip()
            
            if not original_word:
                continue

            start = word_info['start']
            end = word_info['end']
            
            start_sample = int(start * sr)
            end_sample = int(end * sr)
            audio_chunk = audio[start_sample:end_sample]
            
            corrected_word = corrector.correct_word(original_word, audio_chunk, sr=sr)
            
            clean_original = re.sub(r'[^\w\s]', '', original_word).lower()
            clean_corrected = re.sub(r'[^\w\s]', '', corrected_word).lower()

            if clean_original != clean_corrected:
                plain_text.append(corrected_word)
                html_text.append(f"<span style='color: red; font-weight: bold; cursor: help;' title='Base model heard: {original_word}'>{corrected_word}</span>")
                corrections_log.append({"original": original_word, "corrected": corrected_word})
            else:
                plain_text.append(original_word)
                html_text.append(original_word)

    return {
        "text_simple": " ".join(plain_text),
        "text_format_html": " ".join(html_text),
        "corection_total": len(corrections_log),
        "corection_log": corrections_log
    }