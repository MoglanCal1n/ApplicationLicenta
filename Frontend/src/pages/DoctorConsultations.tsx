import React, { useEffect, useState, useRef } from 'react';
import {
  FileText, ArrowLeft, Edit3, Download, CheckCircle, Clock,
  Save, Loader2, User, XCircle, RefreshCw, ChevronDown, ChevronUp, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useToast, StatusBadge, SectionCard, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import {
  loadKeyPair, importPublicKey, decryptFile, encryptFile,
  base64ToArrayBuffer, base64ToUint8Array, arrayBufferToBase64,
} from '../crypto';

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
    <div style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-info-light)' }}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-6 py-3 text-sm font-semibold transition-colors"
        style={{ color: 'var(--color-text-primary)' }}
      >
        <span>{t('consultation.structured_toggle')}</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-6 pb-5 space-y-4">
          {fields.map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>{label}</label>
              <textarea
                rows={2}
                value={value}
                onChange={e => set(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all resize-none"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '2px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
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
  const { show: showToast, ToastNode } = useToast();

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
      // E2EE: Re-encrypt before saving
      let encryptedPayload: Record<string, string> = {};
      if (consultation.patient_user_id && consultation.e2ee_sender_user_id) {
        try {
          const auth = (window as any).__AUTH_USER__;
          if (auth) {
            const keyPair = await loadKeyPair(auth.id);
            if (keyPair) {
              const pubKeyRes = await api.get(`/e2ee/public-key/${consultation.patient_user_id}`);
              const patientPubKey = await importPublicKey(pubKeyRes.data.public_key_jwk);

              const combinedPayload = JSON.stringify({
                final_text: editorRef.current.innerText,
                structured: { symptoms, diagnosis, recommendations, prescriptions },
              });
              const payloadBytes = new TextEncoder().encode(combinedPayload);
              const encrypted = await encryptFile(payloadBytes.buffer, keyPair.privateKey, patientPubKey);

              encryptedPayload = {
                encrypted_final_text: arrayBufferToBase64(encrypted.ciphertext),
                e2ee_iv_b64: arrayBufferToBase64(encrypted.iv.buffer),
                e2ee_salt_b64: arrayBufferToBase64(encrypted.salt.buffer),
              };
            }
          }
        } catch (e2eeErr) {
          console.warn('[E2EE] Re-encryption failed, saving without E2EE:', e2eeErr);
        }
      }

      const res = await api.put(`/consultations/${consultation.id}/update`, {
        final_revised_text: editorRef.current.innerText,
        symptoms, diagnosis, recommendations, prescriptions,
        ...encryptedPayload,
      });
      showToast(t('consultation.save_success'), 'success');
      setTimeout(() => {
        onSaved({
          ...consultation,
          final_revised_text: editorRef.current?.innerText,
          status: 'SIGNED',
          pdf_report_url: res.data.pdf_url,
          // Mark as decrypted since we just saved
          _decrypted: true,
          _decrypted_text: editorRef.current?.innerText,
          _decrypted_structured: { symptoms, diagnosis, recommendations, prescriptions },
        });
        onClose();
      }, 1200);
    } catch (err: any) {
      showToast(err.response?.data?.detail || t('consultation.save_error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      {ToastNode}
      <div
        className="rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-fade-in-up"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }}
      >
        {/* Modal header */}
        <div className="px-6 py-4 flex items-center justify-between rounded-t-2xl" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-elevated)' }}>
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Edit3 className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              {t('consultation.edit_modal_title', { id: consultation.id })}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              {t('consultation.edit_modal_subtitle', {
                email: consultation.patient_email,
                date: new Date(consultation.created_at).toLocaleDateString(),
              })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          className="flex-1 p-6 overflow-y-auto focus:outline-none min-h-[200px] max-h-[280px]"
          contentEditable
          suppressContentEditableWarning
          style={{ fontSize: '1rem', lineHeight: '1.75', color: 'var(--color-text-primary)' }}
        />

        <StructuredFields
          symptoms={symptoms}               setSymptoms={setSymptoms}
          diagnosis={diagnosis}             setDiagnosis={setDiagnosis}
          recommendations={recommendations} setRecommendations={setRecommendations}
          prescriptions={prescriptions}     setPrescriptions={setPrescriptions}
        />

        {/* Footer */}
        <div className="px-6 py-4 rounded-b-2xl flex justify-between items-center gap-4" style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-elevated)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{t('consultation.edit_hint')}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
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

/* ── Main Page ──────────────────────────────────────────────────── */
export default function DoctorConsultations() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<any>(null);
  const { show: showToast, ToastNode } = useToast();
  const [filter, setFilter] = useState<'ALL' | 'DRAFT' | 'SIGNED'>('ALL');

  // Expose user for EditModal E2EE re-encryption
  useEffect(() => {
    if (user) (window as any).__AUTH_USER__ = user;
    return () => { delete (window as any).__AUTH_USER__; };
  }, [user]);

  /**
   * Decrypt a single E2EE-encrypted consultation using the doctor's private key.
   */
  const decryptConsultation = async (c: any): Promise<any> => {
    if (!c.encrypted_final_text || !c.e2ee_iv_b64 || !c.e2ee_salt_b64 || !user) return c;
    if (c._decrypted) return c; // already decrypted

    try {
      const keyPair = await loadKeyPair(user.id);
      if (!keyPair) return c;

      // Doctor was the sender — use patient's public key for ECDH
      const patientUserId = c.patient_user_id;
      if (!patientUserId) return c;

      const pubKeyRes = await api.get(`/e2ee/public-key/${patientUserId}`);
      const patientPubKey = await importPublicKey(pubKeyRes.data.public_key_jwk);

      const iv = base64ToUint8Array(c.e2ee_iv_b64);
      const salt = base64ToUint8Array(c.e2ee_salt_b64);

      // Decrypt the single combined blob
      const ciphertext = base64ToArrayBuffer(c.encrypted_final_text);
      const decryptedRaw = await decryptFile(ciphertext, iv, salt, keyPair.privateKey, patientPubKey);
      const combined = JSON.parse(new TextDecoder().decode(decryptedRaw));

      return {
        ...c,
        _decrypted: true,
        final_revised_text: combined.final_text || '',
        text_format_html: (combined.final_text || '').replace(/\n/g, '<br>'),
        mixed_score_metadata: {
          ...(c.mixed_score_metadata || {}),
          structured_fields: combined.structured || {},
        },
      };
    } catch (err) {
      console.warn(`[E2EE] Failed to decrypt consultation ${c.id}:`, err);
      return { ...c, _decrypted: false };
    }
  };

  const fetchConsultations = async () => {
    try {
      const res = await api.get('/consultations/doctor-history');
      const raw = Array.isArray(res.data) ? res.data : [];

      // Decrypt any E2EE-encrypted consultations
      const decrypted = await Promise.all(raw.map(decryptConsultation));
      setConsultations(decrypted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConsultations(); }, []);

  const handleSaved = (updated: any) => {
    setConsultations(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    showToast(t('consultation.save_success'), 'success');
  };

  const filtered  = filter === 'ALL' ? consultations : consultations.filter(c => c.status === filter);
  const draftCount  = consultations.filter(c => c.status === 'DRAFT').length;
  const signedCount = consultations.filter(c => c.status === 'SIGNED').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {ToastNode}
      {editTarget && (
        <EditModal
          consultation={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/ehealth/dashboard')}
          className="p-2 rounded-xl transition-colors"
          style={{ backgroundColor: 'var(--color-surface-elevated)' }}
        >
          <ArrowLeft className="h-5 w-5" style={{ color: 'var(--color-text-secondary)' }} />
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <FileText className="h-6 w-6" style={{ color: 'var(--color-primary)' }} /> {t('consultation.history_title')}
        </h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-5 text-center" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{loading ? '…' : consultations.length}</p>
          <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{t('consultation.stat_total')}</p>
        </div>
        <div className="rounded-xl p-5 text-center" style={{ backgroundColor: 'var(--color-warning-light)', border: '1px solid var(--color-warning)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-warning)' }}>{loading ? '…' : draftCount}</p>
          <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-warning)' }}>{t('consultation.stat_draft')}</p>
        </div>
        <div className="rounded-xl p-5 text-center" style={{ backgroundColor: 'var(--color-success-light)', border: '1px solid var(--color-success)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-success)' }}>{loading ? '…' : signedCount}</p>
          <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-success)' }}>{t('consultation.stat_signed')}</p>
        </div>
      </div>

      {/* Filter tabs + list */}
      <SectionCard>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-elevated)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('consultation.list_title')}</h2>
          <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
            {(['ALL', 'DRAFT', 'SIGNED'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-md font-medium text-sm transition-all"
                style={{
                  backgroundColor: filter === f ? 'var(--color-surface)' : 'transparent',
                  color: filter === f ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  boxShadow: filter === f ? 'var(--shadow-card)' : 'none',
                }}
              >
                {f === 'ALL' ? t('consultation.tab_all') : f === 'DRAFT' ? t('consultation.tab_draft') : t('consultation.tab_signed')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{t('consultation.no_consultations')}</p>
          </div>
        ) : (
          <div>
            {filtered.map(c => (
              <div
                key={c.id}
                className="p-5 transition-colors"
                style={{ borderBottom: '1px solid var(--color-border)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: c.status === 'SIGNED' ? 'var(--color-success-light)' : 'var(--color-warning-light)',
                        color: c.status === 'SIGNED' ? 'var(--color-success)' : 'var(--color-warning)',
                      }}
                    >
                      {c.status === 'SIGNED' ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Consultație #{c.id}</p>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                        <User className="h-3.5 w-3.5" />
                        {c.patient_email} · {t('consultation.cnp_label')}: {c.patient_cnp}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                        📅 {new Date(c.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        {c.signed_at && ` · ✅ ${new Date(c.signed_at).toLocaleDateString()}`}
                      </p>
                      {(c.final_revised_text || c.ai_draft_transcript) && (
                        <p className="text-xs mt-1.5 italic max-w-lg line-clamp-2" style={{ color: 'var(--color-text-tertiary)' }}>
                          &ldquo;{c.final_revised_text || c.ai_draft_transcript}&rdquo;
                        </p>
                      )}
                      {c.mixed_score_metadata?.structured_fields?.diagnosis && (
                        <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-success)' }}>
                          Dx: {c.mixed_score_metadata.structured_fields.diagnosis}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditTarget(c)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{ border: '2px solid var(--color-primary)', color: 'var(--color-primary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      {t('consultation.edit_btn')}
                    </button>
                    {c.pdf_report_url && (
                      <button
                        onClick={() => window.open(`http://localhost:8000${c.pdf_report_url}`, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                        style={{ backgroundColor: 'var(--color-surface-elevated)', color: 'var(--color-text-secondary)' }}
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
      </SectionCard>
    </div>
  );
}
