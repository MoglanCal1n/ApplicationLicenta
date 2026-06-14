import { useEffect, useState, useCallback } from 'react';
import { FileText, CalendarClock, Loader2, Download, CheckCircle, Clock, CalendarDays, Stethoscope, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { StatusBadge, StatCard, SectionCard, Spinner } from '../components/ui';
import { NOTIFICATION_EVENT } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import {
  loadKeyPair, importPublicKey, decryptFile,
  base64ToArrayBuffer, base64ToUint8Array,
} from '../crypto';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState({ total_consultations: 0, upcoming_appointments: 0 });
  const [consultations, setConsultations] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Decrypt a single E2EE-encrypted consultation using the patient's private key.
   */
  const decryptConsultation = useCallback(async (c: any): Promise<any> => {
    if (!c.encrypted_final_text || !c.e2ee_iv_b64 || !c.e2ee_salt_b64 || !user) return c;

    try {
      const keyPair = await loadKeyPair(user.id);
      if (!keyPair) return c;

      // The sender was the doctor — use the doctor's public key for ECDH
      const doctorUserId = c.doctor_user_id || c.e2ee_sender_user_id;
      if (!doctorUserId) return c;

      const pubKeyRes = await api.get(`/e2ee/public-key/${doctorUserId}`);
      const doctorPubKey = await importPublicKey(pubKeyRes.data.public_key_jwk);

      const iv = base64ToUint8Array(c.e2ee_iv_b64);
      const salt = base64ToUint8Array(c.e2ee_salt_b64);

      const ciphertext = base64ToArrayBuffer(c.encrypted_final_text);
      const decryptedRaw = await decryptFile(ciphertext, iv, salt, keyPair.privateKey, doctorPubKey);
      const combined = JSON.parse(new TextDecoder().decode(decryptedRaw));

      return {
        ...c,
        _decrypted: true,
        ai_draft_transcript: combined.final_text || c.ai_draft_transcript,
        final_revised_text: combined.final_text || '',
      };
    } catch (err) {
      console.warn(`[E2EE] Failed to decrypt consultation ${c.id}:`, err);
      return { ...c, _decrypted: false };
    }
  }, [user]);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, consultRes, apptsRes] = await Promise.all([
        api.get('/stats/patient'),
        api.get('/consultations/my-history'),
        api.get('/appointments/me'),
      ]);
      setStats(statsRes.data);

      // Decrypt E2EE-encrypted consultations
      const raw = Array.isArray(consultRes.data) ? consultRes.data : [];
      const decrypted = await Promise.all(raw.map(decryptConsultation));
      setConsultations(decrypted);

      setAppointments(
        apptsRes.data.filter((a: any) =>
          a.status === 'CONFIRMED' || a.status === 'PENDING'
        )
      );
    } catch (err) {
      console.error('Failed to fetch patient data', err);
    } finally {
      setLoading(false);
    }
  }, [decryptConsultation]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh when a real-time notification arrives (e.g. doctor confirmed/rejected appointment)
  useEffect(() => {
    const handler = () => { fetchAll(); };
    window.addEventListener(NOTIFICATION_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handler);
  }, [fetchAll]);

  const handleDownload = async (consultationId: number) => {
    try {
      const res = await api.get(`/static/pdf/report_${consultationId}.pdf`, {
        responseType: 'blob',
        baseURL: 'http://localhost:8000'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `consultation_${consultationId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      window.open(`http://localhost:8000/static/pdf/report_${consultationId}.pdf`, '_blank');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            {t('dashboard.patient_title')}
          </h2>
          <p className="mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t('dashboard.patient_subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/ehealth/appointments')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            boxShadow: 'var(--shadow-button-primary)',
          }}
        >
          <CalendarClock className="h-5 w-5" />
          {t('nav.book_appointment')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label={t('dashboard.stat_total_consultations')} value={stats.total_consultations} icon={FileText} loading={loading} />
        <StatCard label={t('dashboard.stat_upcoming_patient')} value={stats.upcoming_appointments} icon={CalendarClock} loading={loading} highlight={stats.upcoming_appointments > 0} />
      </div>

      {/* Upcoming appointments */}
      {appointments.length > 0 && (
        <SectionCard>
          <div
            className="p-5 flex items-center gap-2"
            style={{
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-info-light)',
            }}
          >
            <CalendarDays className="h-5 w-5" style={{ color: 'var(--color-info)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('appointments.active_title')}</h3>
          </div>
          <div>
            {appointments.map(appt => (
              <div
                key={appt.id}
                className="p-5 flex items-center justify-between gap-4"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                  >
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm animate-fade-in" style={{ color: 'var(--color-text-primary)' }}>
                      {appt.doctor_specialization || 'Medical Specialty'}
                    </p>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      Dr. {appt.doctor_name || 'Specialist'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      {new Date(appt.appointment_date).toLocaleString(undefined, {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Consultation history */}
      <SectionCard>
        <div
          className="p-5 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-elevated)' }}
        >
          <FileText className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
          <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>{t('consultation.history_title')}</h3>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><Spinner size="lg" /></div>
        ) : consultations.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{t('consultation.no_consultations')}</p>
          </div>
        ) : (
          <div>
            {consultations.map(c => (
              <div
                key={c.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-150"
                style={{ borderBottom: '1px solid var(--color-border)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
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
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Consultație #{c.id}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      Dr. {c.doctor_name} · {c.doctor_specialization}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                      {c.signed_at && ` · ✅ ${new Date(c.signed_at).toLocaleDateString()}`}
                    </p>
                    {c.ai_draft_transcript && (
                      <p className="text-xs mt-1 italic max-w-md truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                        &ldquo;{c.ai_draft_transcript}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {c.pdf_report_url && (
                  <button
                    onClick={() => handleDownload(c.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0"
                    style={{
                      border: '2px solid var(--color-primary)',
                      color: 'var(--color-primary)',
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                  >
                    <Download className="h-4 w-4" />
                    {t('common.download_pdf')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
