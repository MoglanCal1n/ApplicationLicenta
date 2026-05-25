import React, { useState, useRef, useEffect } from 'react';
import {
  Mic, Square, Save, FileText, ArrowLeft, UserCircle,
  CheckCircle, Loader2, Upload, ChevronDown, ChevronUp, Wand2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useToast, SectionCard } from '../components/ui';

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
    <SectionCard>
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-info-light)' }}>
        <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <FileText className="h-5 w-5" style={{ color: 'var(--color-info)' }} /> {t('consultation.structured_form_title')}
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{t('consultation.structured_form_subtitle')}</p>
      </div>
      <div className="p-6 space-y-5">
        {fields.map(({ label, value, set, placeholder }) => (
          <div key={label}>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
            <textarea
              rows={3}
              value={value}
              onChange={e => set(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                border: '2px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function AudioConsultation() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlAppointmentId = searchParams.get('appointmentId');
  const urlPatientId     = searchParams.get('patientId');

  const [mode, setMode] = useState<'record' | 'upload'>('record');
  const [isRecording,  setIsRecording]  = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [transcriptHtml, setTranscriptHtml] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [consultationId, setConsultationId] = useState<number | null>(null);

  const [symptoms,        setSymptoms]        = useState('');
  const [diagnosis,       setDiagnosis]       = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [prescriptions,   setPrescriptions]   = useState('');
  const [showStructured,  setShowStructured]  = useState(true);

  const [patients, setPatients]                   = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(urlPatientId || '');

  const { show: showToast, ToastNode } = useToast();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const editorRef        = useRef<HTMLDivElement>(null);
  const fileUploadRef    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hasTranscript && editorRef.current && transcriptHtml) {
      editorRef.current.innerHTML = transcriptHtml;
    }
  }, [hasTranscript, transcriptHtml]);

  useEffect(() => {
    if (urlPatientId) return;
    api.get('/profiles/patients')
      .then(res => {
        setPatients(res.data);
        if (res.data.length > 0) setSelectedPatientId(res.data[0].id.toString());
      })
      .catch(console.error);
  }, [urlPatientId]);

  const handleTranscriptionResponse = (data: any) => {
    setConsultationId(data.consultation_id);
    setTranscriptHtml(
      data.result.text_format_html ||
      `<p style="color:#999;font-style:italic">[${t('consultation.empty_transcript')}]</p>`
    );
    if (data.structured_fields) {
      setSymptoms(data.structured_fields.symptoms || '');
      setDiagnosis(data.structured_fields.diagnosis || '');
      setRecommendations(data.structured_fields.recommendations || '');
      setPrescriptions(data.structured_fields.prescriptions || '');
    }
    setHasTranscript(true);
  };

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
      if (fileUploadRef.current) fileUploadRef.current.value = '';
    }
  };

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
          showToast("Extragerea a eșuat. Verifică dacă Ollama rulează.", 'error');
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
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
        {ToastNode}
        <div
          className="h-24 w-24 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)', boxShadow: '0 0 40px rgba(34, 197, 94, 0.2)' }}
        >
          <CheckCircle className="h-12 w-12" />
        </div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-success)' }}>{t('consultation.finalized_title')}</h2>
        <p className="max-w-md mb-2" style={{ color: 'var(--color-text-tertiary)' }}>{t('consultation.finalized_subtitle')}</p>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-tertiary)' }}>{t('consultation.finalized_note')}</p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/ehealth/dashboard')}
            className="px-6 py-3 rounded-xl font-semibold transition-all"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white', boxShadow: 'var(--shadow-button-primary)' }}
          >
            {t('consultation.back_to_dashboard')}
          </button>
          <button
            onClick={() => window.open(`http://localhost:8000/static/pdf/report_${consultationId}.pdf`, '_blank')}
            className="px-6 py-3 rounded-xl font-semibold transition-all"
            style={{ border: '2px solid var(--color-primary)', color: 'var(--color-primary)', backgroundColor: 'transparent' }}
          >
            📄 {t('common.open_pdf')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {ToastNode}

      {/* Header with mode toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/ehealth/dashboard')}
            className="p-2 rounded-xl transition-colors"
            style={{ backgroundColor: 'var(--color-surface-elevated)' }}
          >
            <ArrowLeft className="h-5 w-5" style={{ color: 'var(--color-text-secondary)' }} />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Mic className="h-6 w-6" style={{ color: 'var(--color-primary)' }} /> {t('consultation.audio_title')}
          </h1>
        </div>

        {!hasTranscript && !isProcessing && (
          <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
            {(['record', 'upload'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm transition-all"
                style={{
                  backgroundColor: mode === m ? 'var(--color-surface)' : 'transparent',
                  color: mode === m ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  boxShadow: mode === m ? 'var(--shadow-card)' : 'none',
                }}
              >
                {m === 'record' ? <><Mic className="h-3.5 w-3.5" /> {t('consultation.mode_record')}</> : <><Upload className="h-3.5 w-3.5" /> {t('consultation.mode_upload')}</>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Appointment context banner */}
      {urlAppointmentId && !hasTranscript && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--color-info-light)', border: '1px solid var(--color-info)', color: 'var(--color-text-primary)' }}>
          <FileText className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-info)' }} />
          <p className="font-medium text-sm">{t('consultation.context_banner', { id: urlAppointmentId, patient_id: urlPatientId })}</p>
        </div>
      )}

      {/* Patient selection */}
      {!hasTranscript && !isProcessing && !urlPatientId && (
        <SectionCard className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserCircle className="h-6 w-6" style={{ color: 'var(--color-text-tertiary)' }} />
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t('consultation.select_patient')}</label>
              <select
                className="rounded-xl px-3 py-2 min-w-[300px] text-sm outline-none transition-all"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  border: '2px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
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
            <p className="text-sm font-medium px-3 py-1 rounded-lg" style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}>
              {t('consultation.no_patients_warning')}
            </p>
          )}
        </SectionCard>
      )}

      {/* ── Recording / Upload panel ── */}
      {!hasTranscript && (
        <SectionCard className="p-10 flex flex-col items-center text-center">
          {isProcessing ? (
            <div className="animate-pulse space-y-4">
              <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--color-info-light)', color: 'var(--color-info)' }}>
                <FileText className="h-8 w-8 animate-bounce" />
              </div>
              <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('consultation.transcribing')}</h3>
              <p style={{ color: 'var(--color-text-tertiary)' }}>{t('consultation.transcribing_hint')}</p>
            </div>
          ) : mode === 'record' ? (
            <>
              <div
                className="h-24 w-24 rounded-full flex items-center justify-center mb-6 transition-all duration-300"
                style={{
                  backgroundColor: isRecording ? 'var(--color-error-light)' : 'var(--color-primary-light)',
                  color: isRecording ? 'var(--color-error)' : 'var(--color-primary)',
                  boxShadow: isRecording ? '0 0 30px rgba(239,68,68,0.3)' : 'none',
                  animation: isRecording ? 'pulse-ring 2s ease-in-out infinite' : 'none',
                }}
              >
                <Mic className={`h-10 w-10 ${isRecording ? 'animate-bounce' : ''}`} />
              </div>
              <h3 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {isRecording ? t('consultation.recording') : t('consultation.ready')}
              </h3>
              <p className="mb-8 max-w-md" style={{ color: 'var(--color-text-tertiary)' }}>
                {isRecording ? t('consultation.recording_hint') : t('consultation.ready_hint')}
              </p>
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="px-8 py-3 rounded-full font-semibold flex items-center gap-3 transition-colors"
                  style={{ backgroundColor: 'var(--color-error)', color: 'white', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}
                >
                  <Square className="h-5 w-5 fill-current" /> {t('consultation.stop')}
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="px-8 py-3 rounded-full font-semibold flex items-center gap-3 transition-colors"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'white', boxShadow: 'var(--shadow-button-primary)' }}
                >
                  <Mic className="h-5 w-5" /> {t('consultation.start')}
                </button>
              )}
            </>
          ) : (
            <>
              <div className="h-24 w-24 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                <Upload className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{t('consultation.upload_title')}</h3>
              <p className="mb-8 max-w-md" style={{ color: 'var(--color-text-tertiary)' }}>{t('consultation.upload_hint')}</p>
              <button
                onClick={() => fileUploadRef.current?.click()}
                className="px-8 py-3 rounded-full font-semibold flex items-center gap-3 transition-colors"
                style={{ backgroundColor: 'var(--color-primary)', color: 'white', boxShadow: 'var(--shadow-button-primary)' }}
              >
                <Upload className="h-5 w-5" /> {t('consultation.upload_btn')}
              </button>
              <input ref={fileUploadRef} type="file" accept="audio/*,video/webm" className="hidden" onChange={handleFileUpload} />
              <p className="text-xs mt-4" style={{ color: 'var(--color-text-tertiary)' }}>{t('consultation.upload_formats')}</p>
            </>
          )}
        </SectionCard>
      )}

      {/* ── WYSIWYG Editor (after transcript) ── */}
      {hasTranscript && (
        <>
          <SectionCard>
            <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-elevated)' }}>
              <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <FileText className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                {t('consultation.report_title')}
              </h3>
              <div className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}>
                {t('consultation.ai_words_badge')}
              </div>
            </div>
            <div
              ref={editorRef}
              className="p-8 min-h-[300px] max-h-[500px] overflow-y-auto focus:outline-none"
              contentEditable={true}
              suppressContentEditableWarning={true}
              style={{ fontSize: '1.05rem', lineHeight: '1.7', color: 'var(--color-text-primary)' }}
            />
            <div className="px-6 py-3" style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-elevated)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{t('consultation.editor_hint')}</p>
            </div>
          </SectionCard>

          {/* Structured Diagnosis Form */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setShowStructured(p => !p)}
                className="flex items-center gap-2 text-sm font-semibold hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                {showStructured ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {t('consultation.structured_toggle')}
              </button>
              <button
                type="button"
                onClick={handleExtractFromEditor}
                disabled={isExtracting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-info-light)', color: 'var(--color-info)' }}
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

          {/* Finalize button */}
          <div className="flex justify-end">
            <button
              onClick={savePDF}
              disabled={isSaving}
              className="px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-success)', color: 'white', boxShadow: '0 4px 14px rgba(34,197,94,0.3)' }}
            >
              {isSaving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('consultation.saving')}</>
                : <><Save className="h-4 w-4" /> {t('consultation.finalize_btn')}</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
