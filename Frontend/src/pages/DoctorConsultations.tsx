import React, { useEffect, useState, useRef } from 'react';
import {
  FileText, ArrowLeft, Edit3, Download, CheckCircle, Clock,
  Save, Loader2, User, XCircle, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
      {type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <XCircle className="h-5 w-5 flex-shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 ml-2 text-lg">&times;</button>
    </div>
  );
}

/* ── Structured fields section inside the edit modal ─────────────── */
interface StructuredFieldsProps {
  symptoms: string;        setSymptoms: (v: string) => void;
  diagnosis: string;       setDiagnosis: (v: string) => void;
  recommendations: string; setRecommendations: (v: string) => void;
  prescriptions: string;   setPrescriptions: (v: string) => void;
}
function StructuredFields({
  symptoms, setSymptoms,
  diagnosis, setDiagnosis,
  recommendations, setRecommendations,
  prescriptions, setPrescriptions,
}: StructuredFieldsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  const fields = [
    { label: t('consultation.field_symptoms'),        value: symptoms,        set: setSymptoms },
    { label: t('consultation.field_diagnosis'),       value: diagnosis,       set: setDiagnosis },
    { label: t('consultation.field_recommendations'), value: recommendations, set: setRecommendations },
    { label: t('consultation.field_prescriptions'),   value: prescriptions,   set: setPrescriptions },
  ];

  return (
    <div className="border-t bg-blue-50/40">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-6 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-100/50 transition-colors"
      >
        <span>{t('consultation.structured_toggle')}</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-6 pb-5 space-y-4">
          {fields.map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-xs font-semibold mb-1 text-slate-600 uppercase tracking-wide">{label}</label>
              <textarea
                rows={2}
                value={value}
                onChange={e => set(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 focus:border-primary rounded-lg px-3 py-2 text-sm outline-none transition-colors resize-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Edit Modal ─────────────────────────────────────────────────── */
interface EditModalProps {
  consultation: any;
  onClose: () => void;
  onSaved: (updated: any) => void;
}
function EditModal({ consultation, onClose, onSaved }: EditModalProps) {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Structured fields — pre-populate from metadata if available
  const savedFields = consultation.mixed_score_metadata?.structured_fields || {};
  const [symptoms,        setSymptoms]        = useState(savedFields.symptoms        || '');
  const [diagnosis,       setDiagnosis]       = useState(savedFields.diagnosis       || '');
  const [recommendations, setRecommendations] = useState(savedFields.recommendations || '');
  const [prescriptions,   setPrescriptions]   = useState(savedFields.prescriptions   || '');

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML =
        consultation.text_format_html ||
        consultation.final_revised_text ||
        consultation.ai_draft_transcript ||
        '';
    }
  }, [consultation]);

  const handleSave = async () => {
    if (!editorRef.current) return;
    setSaving(true);
    try {
      const res = await api.put(`/consultations/${consultation.id}/update`, {
        final_revised_text: editorRef.current.innerText,
        symptoms,
        diagnosis,
        recommendations,
        prescriptions,
      });
      setToast({ message: t('consultation.save_success'), type: 'success' });
      setTimeout(() => {
        onSaved({
          ...consultation,
          final_revised_text: editorRef.current?.innerText,
          status: 'SIGNED',
          pdf_report_url: res.data.pdf_url,
        });
        onClose();
      }, 1200);
    } catch (err: any) {
      setToast({ message: err.response?.data?.detail || t('consultation.save_error'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        {/* Modal header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              {t('consultation.edit_modal_title', { id: consultation.id })}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('consultation.edit_modal_subtitle', {
                email: consultation.patient_email,
                date: new Date(consultation.created_at).toLocaleDateString(),
              })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          className="flex-1 p-6 overflow-y-auto focus:outline-none min-h-[200px] max-h-[280px]"
          contentEditable
          suppressContentEditableWarning
          style={{ fontSize: '1rem', lineHeight: '1.75' }}
        />

        {/* Structured fields */}
        <StructuredFields
          symptoms={symptoms}               setSymptoms={setSymptoms}
          diagnosis={diagnosis}             setDiagnosis={setDiagnosis}
          recommendations={recommendations} setRecommendations={setRecommendations}
          prescriptions={prescriptions}     setPrescriptions={setPrescriptions}
        />

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 rounded-b-2xl flex justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">{t('consultation.edit_hint')}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('consultation.saving')}</>
                : <><RefreshCw className="h-4 w-4" /> {t('consultation.save_regenerate')}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Status Badge ───────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT:  { label: t('common.status_draft'),  cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    SIGNED: { label: t('common.status_signed'), cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  };
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-700 border-gray-200' };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${s.cls}`}>{s.label}</span>;
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function DoctorConsultations() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'DRAFT' | 'SIGNED'>('ALL');

  const fetchConsultations = async () => {
    try {
      const res = await api.get('/consultations/doctor-history');
      setConsultations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConsultations(); }, []);

  const handleSaved = (updated: any) => {
    setConsultations(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    setToast({ message: t('consultation.save_success'), type: 'success' });
  };

  const filtered  = filter === 'ALL' ? consultations : consultations.filter(c => c.status === filter);
  const draftCount  = consultations.filter(c => c.status === 'DRAFT').length;
  const signedCount = consultations.filter(c => c.status === 'SIGNED').length;

  return (
    <div className="min-h-screen bg-muted/10 pb-16">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {editTarget && (
        <EditModal
          consultation={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <FileText className="h-5 w-5" /> {t('consultation.history_title')}
        </h1>
      </header>

      <main className="max-w-4xl mx-auto p-6 mt-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border rounded-xl p-5 shadow-sm text-center">
            <p className="text-3xl font-bold">{loading ? '…' : consultations.length}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{t('consultation.stat_total')}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 shadow-sm text-center">
            <p className="text-3xl font-bold text-yellow-700">{loading ? '…' : draftCount}</p>
            <p className="text-xs text-yellow-600 mt-1 font-medium">{t('consultation.stat_draft')}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm text-center">
            <p className="text-3xl font-bold text-emerald-700">{loading ? '…' : signedCount}</p>
            <p className="text-xs text-emerald-600 mt-1 font-medium">{t('consultation.stat_signed')}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
            <h2 className="font-semibold">{t('consultation.list_title')}</h2>
            <div className="flex gap-1 bg-muted rounded-lg p-1 text-sm">
              {(['ALL', 'DRAFT', 'SIGNED'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${filter === f ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {f === 'ALL' ? t('consultation.tab_all') : f === 'DRAFT' ? t('consultation.tab_draft') : t('consultation.tab_signed')}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t('consultation.no_consultations')}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(c => (
                <div key={c.id} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Info */}
                    <div className="flex items-start gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        c.status === 'SIGNED' ? 'bg-emerald-100 text-emerald-600' : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {c.status === 'SIGNED' ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">Consultație #{c.id}</p>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {c.patient_email} · {t('consultation.cnp_label')}: {c.patient_cnp}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          📅 {new Date(c.created_at).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'long', day: 'numeric',
                          })}
                          {c.signed_at && ` · ✅ ${new Date(c.signed_at).toLocaleDateString()}`}
                        </p>
                        {/* ✅ FIX: use JSX interpolation, not string literal */}
                        {(c.final_revised_text || c.ai_draft_transcript) && (
                          <p className="text-xs text-muted-foreground mt-1.5 italic max-w-lg line-clamp-2">
                            &ldquo;{c.final_revised_text || c.ai_draft_transcript}&rdquo;
                          </p>
                        )}
                        {/* Show structured fields if present */}
                        {c.mixed_score_metadata?.structured_fields?.diagnosis && (
                          <p className="text-xs text-emerald-700 mt-1 font-medium">
                            Dx: {c.mixed_score_metadata.structured_fields.diagnosis}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setEditTarget(c)}
                        className="flex items-center gap-1.5 px-3 py-2 border-2 border-primary text-primary rounded-lg text-xs font-semibold hover:bg-primary hover:text-white transition-all"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        {t('consultation.edit_btn')}
                      </button>
                      {c.pdf_report_url && (
                        <button
                          onClick={() => window.open(`http://localhost:8000${c.pdf_report_url}`, '_blank')}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
