import React, { useEffect, useState } from 'react';
import { FileText, CalendarClock, Loader2, Download, CheckCircle, Clock, CalendarDays, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    DRAFT:  'bg-yellow-100 text-yellow-800 border-yellow-200',
    SIGNED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  const labels: Record<string, string> = {
    DRAFT: t('common.status_draft'),
    SIGNED: t('common.status_signed'),
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
}

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
        // consultRes.data is already a list of enriched dicts from /my-history
        setConsultations(Array.isArray(consultRes.data) ? consultRes.data : []);
        // Show CONFIRMED and PENDING appointments (not COMPLETED or REJECTED)
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
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('dashboard.patient_title')}</h2>
          <p className="text-muted-foreground mt-1">{t('dashboard.patient_subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/book-appointment')}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
        >
          <CalendarClock className="h-5 w-5" />
          {t('nav.book_appointment')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">{t('dashboard.stat_total_consultations')}</h3>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : stats.total_consultations}
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">{t('dashboard.stat_upcoming_patient')}</h3>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : stats.upcoming_appointments}
          </div>
        </div>
      </div>

      {/* Upcoming appointments */}
      {appointments.length > 0 && (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-blue-50 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">{t('appointments.active_title')}</h3>
          </div>
          <div className="divide-y">
            {appointments.map(appt => (
              <div key={appt.id} className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {t('appointments.patient_id', { id: appt.id })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(appt.appointment_date).toLocaleString(undefined, {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  appt.status === 'CONFIRMED'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                }`}>
                  {appt.status === 'CONFIRMED'
                    ? t('common.status_confirmed')
                    : t('common.status_pending')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consultation history */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-50 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">{t('consultation.history_title')}</h3>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : consultations.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{t('consultation.no_consultations')}</p>
          </div>
        ) : (
          <div className="divide-y">
            {consultations.map(c => (
              <div key={c.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    c.status === 'SIGNED' ? 'bg-emerald-100 text-emerald-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {c.status === 'SIGNED' ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">Consultație #{c.id}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Dr. {c.doctor_name} · {c.doctor_specialization}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                      {c.signed_at && ` · ✅ ${new Date(c.signed_at).toLocaleDateString()}`}
                    </p>
                    {/* ✅ FIX: use interpolation, not a string literal */}
                    {c.ai_draft_transcript && (
                      <p className="text-xs text-muted-foreground mt-1 italic max-w-md truncate">
                        &ldquo;{c.ai_draft_transcript}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {c.pdf_report_url && (
                  <button
                    onClick={() => handleDownload(c.id)}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary rounded-lg text-sm font-semibold hover:bg-primary hover:text-white transition-all flex-shrink-0"
                  >
                    <Download className="h-4 w-4" />
                    {t('common.download_pdf')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
