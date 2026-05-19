import React, { useEffect, useState, useCallback } from 'react';
import { Users, Calendar, Activity, Loader2, Clock, Play, CheckCircle, XCircle, ClipboardList, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

/* ─── Toast ──────────────────────────────────────────────────────────── */
interface ToastProps { message: string; type: 'success' | 'error'; onClose: () => void; }
function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 border-l-4 rounded-xl shadow-xl text-sm font-medium max-w-sm ${type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
      {type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <XCircle className="h-5 w-5 flex-shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 text-lg leading-none ml-2">&times;</button>
    </div>
  );
}

/* ─── Status Badge ───────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    PENDING:   'bg-yellow-100 text-yellow-800 border-yellow-200',
    CONFIRMED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200',
    REJECTED:  'bg-red-100 text-red-800 border-red-200',
  };
  const labels: Record<string, string> = {
    PENDING:   t('common.status_pending'),
    CONFIRMED: t('common.status_confirmed'),
    COMPLETED: t('common.status_completed'),
    REJECTED:  t('common.status_rejected'),
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
}

/* ─── Appointment Card ───────────────────────────────────────────────── */
interface ApptCardProps {
  appt: any;
  onAction: (id: number, action: 'CONFIRMED' | 'REJECTED') => void;
  onStart: (appt: any) => void;
  actionLoading: number | null;
}
function AppointmentCard({ appt, onAction, onStart, actionLoading }: ApptCardProps) {
  const { t } = useTranslation();
  const isLoading = actionLoading === appt.id;
  return (
    <div className={`p-5 transition-colors border-b last:border-b-0 ${appt.status === 'PENDING' ? 'bg-yellow-50/40' : 'bg-white'} hover:bg-slate-50`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">P{appt.patient_id}</div>
            <div>
              <p className="font-semibold text-sm">
                {t('appointments.patient_id', { id: appt.patient_id })}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(appt.appointment_date).toLocaleString(undefined, {
                  weekday: 'long', year: 'numeric', month: 'long',
                  day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={appt.status} />

          {appt.status === 'PENDING' && (
            <>
              <button
                onClick={() => onAction(appt.id, 'CONFIRMED')}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                {t('appointments.accept')}
              </button>
              <button
                onClick={() => onAction(appt.id, 'REJECTED')}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                {t('appointments.reject')}
              </button>
            </>
          )}

          {appt.status === 'CONFIRMED' && (
            <button
              onClick={() => onStart(appt)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {t('appointments.start_recording')}
            </button>
          )}

          {appt.status === 'CONFIRMED' && (
            <button
              onClick={() => onAction(appt.id, 'REJECTED')}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 hover:bg-red-50 text-red-600 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              {t('appointments.reject')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────────────────── */
export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState({ total_patients: 0, consultations_today: 0, upcoming_appointments: 0, pending_appointments: 0 });
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'CONFIRMED' | 'ALL'>('PENDING');

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, apptsRes] = await Promise.all([
        api.get('/stats/doctor'),
        api.get('/appointments/me')
      ]);
      setStats(statsRes.data);
      setAppointments(apptsRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (id: number, newStatus: 'CONFIRMED' | 'REJECTED') => {
    setActionLoading(id);
    try {
      await api.put(`/appointments/${id}/status`, { status: newStatus });
      showToast(
        newStatus === 'CONFIRMED' ? t('appointments.accepted_toast') : t('appointments.rejected_toast'),
        newStatus === 'CONFIRMED' ? 'success' : 'error'
      );
      await fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || t('appointments.action_error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStart = (appt: any) => {
    navigate(`/audio-consultation?appointmentId=${appt.id}&patientId=${appt.patient_id}`);
  };

  // ALL tab shows everything that isn't COMPLETED; other tabs filter by exact status
  const filteredAppts = appointments.filter(a => {
    if (activeTab === 'ALL') return a.status !== 'COMPLETED';
    return a.status === activeTab;
  });

  const pendingCount   = appointments.filter(a => a.status === 'PENDING').length;
  const confirmedCount = appointments.filter(a => a.status === 'CONFIRMED').length;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('dashboard.doctor_title')}</h2>
          <p className="text-muted-foreground mt-1">{t('dashboard.doctor_subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/doctor-consultations')}
          className="flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary rounded-lg font-medium hover:bg-primary hover:text-white transition-all text-sm"
        >
          <ClipboardList className="h-4 w-4" />
          {t('nav.my_consultations')}
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t('dashboard.stat_total_patients'),     value: stats.total_patients,        Icon: Users },
          { label: t('dashboard.stat_consultations_today'),value: stats.consultations_today,   Icon: Activity },
          { label: t('dashboard.stat_upcoming'),           value: stats.upcoming_appointments, Icon: Calendar },
          { label: t('dashboard.stat_pending'),            value: stats.pending_appointments,  Icon: Bell, highlight: stats.pending_appointments > 0 },
        ].map(({ label, value, Icon, highlight }) => (
          <div key={label} className={`border rounded-xl p-6 shadow-sm transition-colors ${highlight ? 'bg-yellow-50 border-yellow-200' : 'bg-card'}`}>
            <div className="flex items-center justify-between pb-2">
              <h3 className="tracking-tight text-sm font-medium">{label}</h3>
              <Icon className={`h-4 w-4 ${highlight ? 'text-yellow-600' : 'text-muted-foreground'}`} />
            </div>
            <div className={`text-2xl font-bold ${highlight ? 'text-yellow-700' : ''}`}>
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : value}
            </div>
          </div>
        ))}
      </div>

      {/* Appointments section */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {/* Header + tabs */}
        <div className="p-5 border-b bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> {t('appointments.title')}
          </h3>
          <div className="flex gap-1 bg-muted rounded-lg p-1 text-sm">
            {(['PENDING', 'CONFIRMED', 'ALL'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${activeTab === tab ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {tab === 'PENDING'
                  ? `${t('appointments.tab_pending')}${pendingCount > 0 ? ` (${pendingCount})` : ''}`
                  : tab === 'CONFIRMED'
                  ? `${t('appointments.tab_confirmed')}${confirmedCount > 0 ? ` (${confirmedCount})` : ''}`
                  : t('appointments.tab_all')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filteredAppts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {activeTab === 'PENDING'   ? t('appointments.no_pending')
               : activeTab === 'CONFIRMED' ? t('appointments.no_confirmed')
               : t('appointments.no_all')}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredAppts.map(appt => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                onAction={handleAction}
                onStart={handleStart}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
