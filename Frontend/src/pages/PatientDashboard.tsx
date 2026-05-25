import { useEffect, useState } from 'react';
import { FileText, CalendarClock, Loader2, Download, CheckCircle, Clock, CalendarDays, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { StatusBadge, StatCard, SectionCard, Spinner } from '../components/ui';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState({ total_consultations: 0, upcoming_appointments: 0 });
  const [consultations, setConsultations] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, consultRes, apptsRes] = await Promise.all([
          api.get('/stats/patient'),
          api.get('/consultations/my-history'),
          api.get('/appointments/me'),
        ]);
        setStats(statsRes.data);
        setConsultations(Array.isArray(consultRes.data) ? consultRes.data : []);
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
    };
    fetchAll();
  }, []);

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
                    <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {t('appointments.patient_id', { id: appt.id })}
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
