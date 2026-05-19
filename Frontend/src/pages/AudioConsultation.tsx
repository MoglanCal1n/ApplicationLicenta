import React, { useState, useRef, useEffect } from 'react';
import {
  Mic, Square, Save, FileText, ArrowLeft, UserCircle,
  CheckCircle, Loader2, Upload, ChevronDown, ChevronUp, Wand2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

/* ── Toast ─────────────────────────────────────────────────────────── */
interface ToastProps { message: string; type: 'success' | 'error'; onClose: () => void; }
function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 border-l-4 rounded-xl shadow-xl text-sm font-medium max-w-sm ${
      type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-red-50 border-red-500 text-red-800'
    }`}>
      {type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <span className="text-lg flex-shrink-0">✕</span>}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 ml-2">&times;</button>
    </div>
  );
}

/* ── Structured Diagnosis Form ──────────────────────────────────────── */
interface DiagnosisFormProps {
  symptoms: string; setSymptoms: (v: string) => void;
  diagnosis: string; setDiagnosis: (v: string) => void;
  recommendations: string; setRecommendations: (v: string) => void;
  prescriptions: string; setPrescriptions: (v: string) => void;
}
function DiagnosisForm({
  symptoms, setSymptoms,
  diagnosis, setDiagnosis,
  recommendations, setRecommendations,
  prescriptions, setPrescriptions,
}: DiagnosisFormProps) {
  const { t } = useTranslation();
  const fields = [
    { label: t('consultation.field_symptoms'),        value: symptoms,        set: setSymptoms,        placeholder: t('consultation.field_symptoms_placeholder') },
    { label: t('consultation.field_diagnosis'),       value: diagnosis,       set: setDiagnosis,       placeholder: t('consultation.field_diagnosis_placeholder') },
    { label: t('consultation.field_recommendations'), value: recommendations, set: setRecommendations, placeholder: t('consultation.field_recommendations_placeholder') },
    { label: t('consultation.field_prescriptions'),   value: prescriptions,   set: setPrescriptions,   placeholder: t('consultation.field_prescriptions_placeholder') },
  ];

  return (
    <div className="bg-white border rounded-xl shadow-lg overflow-hidden">
      <div className="bg-blue-50 border-b px-6 py-4">
        <h3 className="font-semibold flex items-center gap-2 text-blue-900">
          <FileText className="h-5 w-5" /> {t('consultation.structured_form_title')}
        </h3>
        <p className="text-xs text-blue-700 mt-0.5">{t('consultation.structured_form_subtitle')}</p>
      </div>
      <div className="p-6 space-y-5">
        {fields.map(({ label, value, set, placeholder }) => (
          <div key={label}>
            <label className="block text-sm font-semibold mb-1.5 text-slate-700">{label}</label>
            <textarea
              rows={3}
              value={value}
              onChange={e => set(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary rounded-xl px-4 py-3 text-sm outline-none transition-colors resize-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function AudioConsultation() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlAppointmentId = searchParams.get('appointmentId');
  const urlPatientId     = searchParams.get('patientId');

  // Recording / upload mode
  const [mode, setMode] = useState<'record' | 'upload'>('record');

  // State machine
  const [isRecording,  setIsRecording]  = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [transcriptHtml, setTranscriptHtml] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [consultationId, setConsultationId] = useState<number | null>(null);

  // Structured PDF fields
  const [symptoms,        setSymptoms]        = useState('');
  const [diagnosis,       setDiagnosis]       = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [prescriptions,   setPrescriptions]   = useState('');
  const [showStructured,  setShowStructured]  = useState(true);

  // Patient selection
  const [patients, setPatients]                   = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(urlPatientId || '');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const editorRef        = useRef<HTMLDivElement>(null);
  const fileUploadRef    = useRef<HTMLInputElement>(null);

  // Inject transcript HTML into the WYSIWYG editor
  useEffect(() => {
    if (hasTranscript && editorRef.current && transcriptHtml) {
      editorRef.current.innerHTML = transcriptHtml;
    }
  }, [hasTranscript, transcriptHtml]);

  // Load patient list (unless injected via URL params)
  useEffect(() => {
    if (urlPatientId) return;
    api.get('/profiles/patients')
      .then(res => {
        setPatients(res.data);
        if (res.data.length > 0) setSelectedPatientId(res.data[0].id.toString());
      })
      .catch(console.error);
  }, [urlPatientId]);

  /* ── Helpers ── */
  const handleTranscriptionResponse = (data: any) => {
    setConsultationId(data.consultation_id);
    setTranscriptHtml(
      data.result.text_format_html ||
      `<p style="color:#999;font-style:italic">[${t('consultation.empty_transcript')}]</p>`
    );
    // Pre-populate structured fields from AI extraction
    if (data.structured_fields) {
      setSymptoms(data.structured_fields.symptoms || '');
      setDiagnosis(data.structured_fields.diagnosis || '');
      setRecommendations(data.structured_fields.recommendations || '');
      setPrescriptions(data.structured_fields.prescriptions || '');
    }
    setHasTranscript(true);
  };

  /* ── Live recording ── */
  const startRecording = async () => {
    if (!selectedPatientId) { showToast(t('consultation.error_patient'), 'error'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'consultation.webm');
        formData.append('patient_id', selectedPatientId);
        if (urlAppointmentId) formData.append('appointment_id', urlAppointmentId);
        try {
          const res = await api.post('/consultations/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          handleTranscriptionResponse(res.data);
        } catch (error: any) {
          showToast(t('consultation.error_transcription', { detail: error.response?.data?.detail || error.message }), 'error');
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setHasTranscript(false);
    } catch {
      showToast(t('consultation.error_mic'), 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  /* ── File upload ── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedPatientId) { showToast(t('consultation.error_patient'), 'error'); return; }

    setIsProcessing(true);
    setHasTranscript(false);

    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('patient_id', selectedPatientId);
    if (urlAppointmentId) formData.append('appointment_id', urlAppointmentId);

    try {
      const res = await api.post('/consultations/upload-audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      handleTranscriptionResponse(res.data);
    } catch (error: any) {
      showToast(t('consultation.error_transcription', { detail: error.response?.data?.detail || error.message }), 'error');
    } finally {
      setIsProcessing(false);
      // Reset input so the same file can be re-selected
      if (fileUploadRef.current) fileUploadRef.current.value = '';
    }
  };

  /* ── Save / Finalize ── */
  const savePDF = async () => {
    if (!consultationId || !editorRef.current) return;
    setIsSaving(true);
    try {
      await api.post(`/consultations/${consultationId}/finalize`, {
        final_revised_text: editorRef.current.innerText,
        symptoms,
        diagnosis,
        recommendations,
        prescriptions,
      });
      setIsFinalized(true);
      showToast(t('consultation.finalized_title'), 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || t('consultation.error_finalize'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Extract fields from editor ── */
  const [isExtracting, setIsExtracting] = useState(false);
  const handleExtractFromEditor = async () => {
    if (!editorRef.current) return;
    setIsExtracting(true);
    try {
      const text = editorRef.current.innerText;
      const res = await api.post('/consultations/extract-from-text', { text });
      const data = res.data;
      if (data) {
        setSymptoms(data.symptoms || '');
        setDiagnosis(data.diagnosis || '');
        setRecommendations(data.recommendations || '');
        setPrescriptions(data.prescriptions || '');
        
        if (!data.symptoms && !data.diagnosis && !data.recommendations && !data.prescriptions) {
          showToast("Extragerea a eșuat. Verifică dacă Ollama rulează (Connection Refused).", 'error');
        } else {
          showToast(t('consultation.extract_success'), 'success');
        }
        setShowStructured(true);
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || t('consultation.error_transcription'), 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  /* ── Success screen ── */
  if (isFinalized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex flex-col items-center justify-center p-6 text-center">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="h-24 w-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 shadow-lg">
          <CheckCircle className="h-12 w-12" />
        </div>
        <h2 className="text-3xl font-bold text-emerald-800 mb-2">{t('consultation.finalized_title')}</h2>
        <p className="text-muted-foreground max-w-md mb-2">{t('consultation.finalized_subtitle')}</p>
        <p className="text-sm text-muted-foreground mb-8">{t('consultation.finalized_note')}</p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow"
          >
            {t('consultation.back_to_dashboard')}
          </button>
          <button
            onClick={() => window.open(`http://localhost:8000/static/pdf/report_${consultationId}.pdf`, '_blank')}
            className="border-2 border-primary text-primary px-6 py-3 rounded-xl font-semibold hover:bg-primary/5 transition-colors"
          >
            📄 {t('common.open_pdf')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Mic className="h-5 w-5" /> {t('consultation.audio_title')}
          </h1>
        </div>

        {/* Mode toggle: Record vs Upload */}
        {!hasTranscript && !isProcessing && (
          <div className="flex gap-1 bg-muted rounded-lg p-1 text-sm">
            <button
              onClick={() => setMode('record')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${mode === 'record' ? 'bg-white shadow text-foreground' : 'text-muted-foreground'}`}
            >
              <Mic className="h-3.5 w-3.5" /> {t('consultation.mode_record')}
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${mode === 'upload' ? 'bg-white shadow text-foreground' : 'text-muted-foreground'}`}
            >
              <Upload className="h-3.5 w-3.5" /> {t('consultation.mode_upload')}
            </button>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto p-6 mt-6 space-y-6">

        {/* Appointment context banner */}
        {urlAppointmentId && !hasTranscript && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 text-blue-800">
            <FileText className="h-5 w-5 flex-shrink-0" />
            <p className="font-medium text-sm">
              {t('consultation.context_banner', { id: urlAppointmentId, patient_id: urlPatientId })}
            </p>
          </div>
        )}

        {/* Patient selection (only when no appointment context) */}
        {!hasTranscript && !isProcessing && !urlPatientId && (
          <div className="bg-card border rounded-xl shadow-sm p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserCircle className="h-6 w-6 text-muted-foreground" />
              <div>
                <label className="block text-sm font-medium mb-1">{t('consultation.select_patient')}</label>
                <select
                  className="bg-background border rounded-md px-3 py-2 min-w-[300px] text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                  disabled={isRecording}
                >
                  {patients.length === 0
                    ? <option value="">{t('consultation.no_patients')}</option>
                    : patients.map(p => <option key={p.id} value={p.id}>Pacient ID: {p.id} (CNP: {p.cnp})</option>)
                  }
                </select>
              </div>
            </div>
            {patients.length === 0 && (
              <p className="text-sm text-red-500 font-medium bg-red-50 px-3 py-1 rounded border border-red-200">
                {t('consultation.no_patients_warning')}
              </p>
            )}
          </div>
        )}

        {/* ── Recording / Upload panel ── */}
        {!hasTranscript && (
          <div className="bg-card border rounded-xl shadow-sm p-10 flex flex-col items-center text-center">
            {isProcessing ? (
              <div className="animate-pulse space-y-4">
                <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="h-8 w-8 animate-bounce" />
                </div>
                <h3 className="text-xl font-semibold">{t('consultation.transcribing')}</h3>
                <p className="text-muted-foreground">{t('consultation.transcribing_hint')}</p>
              </div>
            ) : mode === 'record' ? (
              /* ── Live recording UI ── */
              <>
                <div className={`h-24 w-24 rounded-full flex items-center justify-center mb-6 transition-all duration-300 ${
                  isRecording
                    ? 'bg-red-100 text-red-500 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                    : 'bg-primary/10 text-primary'
                }`}>
                  <Mic className={`h-10 w-10 ${isRecording ? 'animate-bounce' : ''}`} />
                </div>
                <h3 className="text-2xl font-semibold mb-2">
                  {isRecording ? t('consultation.recording') : t('consultation.ready')}
                </h3>
                <p className="text-muted-foreground mb-8 max-w-md">
                  {isRecording ? t('consultation.recording_hint') : t('consultation.ready_hint')}
                </p>
                {isRecording ? (
                  <button onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-semibold flex items-center gap-3 shadow-lg transition-colors">
                    <Square className="h-5 w-5 fill-current" /> {t('consultation.stop')}
                  </button>
                ) : (
                  <button onClick={startRecording} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-full font-semibold flex items-center gap-3 shadow-lg transition-colors">
                    <Mic className="h-5 w-5" /> {t('consultation.start')}
                  </button>
                )}
              </>
            ) : (
              /* ── File upload UI ── */
              <>
                <div className="h-24 w-24 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <Upload className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">{t('consultation.upload_title')}</h3>
                <p className="text-muted-foreground mb-8 max-w-md">{t('consultation.upload_hint')}</p>
                <button
                  onClick={() => fileUploadRef.current?.click()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-full font-semibold flex items-center gap-3 shadow-lg transition-colors"
                >
                  <Upload className="h-5 w-5" /> {t('consultation.upload_btn')}
                </button>
                <input
                  ref={fileUploadRef}
                  type="file"
                  accept="audio/*,video/webm"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <p className="text-xs text-muted-foreground mt-4">{t('consultation.upload_formats')}</p>
              </>
            )}
          </div>
        )}

        {/* ── WYSIWYG Editor (after transcript) ── */}
        {hasTranscript && (
          <>
            <div className="bg-white border rounded-xl shadow-lg overflow-hidden">
              <div className="bg-slate-50 border-b px-6 py-4 flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {t('consultation.report_title')}
                </h3>
                <div className="text-xs font-medium px-3 py-1 bg-red-100 text-red-700 rounded-full border border-red-200">
                  {t('consultation.ai_words_badge')}
                </div>
              </div>

              <div
                ref={editorRef}
                className="p-8 min-h-[300px] max-h-[500px] overflow-y-auto focus:outline-none"
                contentEditable={true}
                suppressContentEditableWarning={true}
                style={{ fontSize: '1.05rem', lineHeight: '1.7' }}
              />

              <div className="bg-slate-50 border-t px-6 py-3">
                <p className="text-xs text-muted-foreground">{t('consultation.editor_hint')}</p>
              </div>
            </div>

            {/* ── Structured Diagnosis Form ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setShowStructured(p => !p)}
                  className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  {showStructured ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {t('consultation.structured_toggle')}
                </button>
                <button
                  type="button"
                  onClick={handleExtractFromEditor}
                  disabled={isExtracting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isExtracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  {t('consultation.extract_from_editor')}
                </button>
              </div>
              {showStructured && (
                <DiagnosisForm
                  symptoms={symptoms}        setSymptoms={setSymptoms}
                  diagnosis={diagnosis}      setDiagnosis={setDiagnosis}
                  recommendations={recommendations} setRecommendations={setRecommendations}
                  prescriptions={prescriptions}     setPrescriptions={setPrescriptions}
                />
              )}
            </div>

            {/* ── Finalize button ── */}
            <div className="flex justify-end">
              <button
                onClick={savePDF}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              >
                {isSaving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('consultation.saving')}</>
                  : <><Save className="h-4 w-4" /> {t('consultation.finalize_btn')}</>}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
