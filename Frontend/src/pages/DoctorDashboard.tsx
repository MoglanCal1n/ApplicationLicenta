import { useEffect, useState, useCallback } from 'react';
import { Users, Calendar, Activity, Loader2, Clock, Play, CheckCircle, XCircle, ClipboardList, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { Toast, useToast, StatusBadge, StatCard, SectionCard, Spinner } from '../components/ui';

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
    <div
      className="p-5 transition-all duration-200 last:border-b-0"
      style={{
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: appt.status === 'PENDING' ? 'var(--color-warning-light)' : 'var(--color-surface)',
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = appt.status === 'PENDING' ? 'var(--color-warning-light)' : 'var(--color-surface)'}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
            >
              P{appt.patient_id}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {t('appointments.patient_id', { id: appt.patient_id })}
              </p>
              <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-success)' }}
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                {t('appointments.accept')}
              </button>
              <button
                onClick={() => onAction(appt.id, 'REJECTED')}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-error)' }}
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                {t('appointments.reject')}
              </button>
            </>
          )}

          {appt.status === 'CONFIRMED' && (
            <>
              <button
                onClick={() => onStart(appt)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-primary)', boxShadow: 'var(--shadow-button-primary)' }}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {t('appointments.start_recording')}
              </button>
              <button
                onClick={() => onAction(appt.id, 'REJECTED')}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                style={{
                  border: '1px solid var(--color-error)',
                  color: 'var(--color-error)',
                  backgroundColor: 'transparent',
                }}
              >
                <XCircle className="h-3.5 w-3.5" />
                {t('appointments.reject')}
              </button>
            </>
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
  const { show: showToast, ToastNode } = useToast();
  const [activeTab, setActiveTab] = useState<'PENDING' | 'CONFIRMED' | 'ALL'>('PENDING');

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
    navigate(`/ehealth/consultation?appointmentId=${appt.id}&patientId=${appt.patient_id}`);
  };

  const filteredAppts = appointments.filter(a => {
    if (activeTab === 'ALL') return a.status !== 'COMPLETED';
    return a.status === activeTab;
  });

  const pendingCount   = appointments.filter(a => a.status === 'PENDING').length;
  const confirmedCount = appointments.filter(a => a.status === 'CONFIRMED').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {ToastNode}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            {t('dashboard.doctor_title')}
          </h2>
          <p className="mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t('dashboard.doctor_subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/ehealth/consultations')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90"
          style={{
            border: '2px solid var(--color-primary)',
            color: 'var(--color-primary)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)'; }}
        >
          <ClipboardList className="h-4 w-4" />
          {t('nav.my_consultations')}
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('dashboard.stat_total_patients')} value={stats.total_patients} icon={Users} loading={loading} />
        <StatCard label={t('dashboard.stat_consultations_today')} value={stats.consultations_today} icon={Activity} loading={loading} />
        <StatCard label={t('dashboard.stat_upcoming')} value={stats.upcoming_appointments} icon={Calendar} loading={loading} />
        <StatCard label={t('dashboard.stat_pending')} value={stats.pending_appointments} icon={Bell} loading={loading} highlight={stats.pending_appointments > 0} />
      </div>

      {/* Appointments section */}
      <SectionCard>
        {/* Header + tabs */}
        <div
          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-elevated)' }}
        >
          <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <ClipboardList className="h-5 w-5" style={{ color: 'var(--color-primary)' }} /> {t('appointments.title')}
          </h3>
          <div
            className="flex gap-1 rounded-lg p-1 text-sm"
            style={{ backgroundColor: 'var(--color-surface-elevated)' }}
          >
            {(['PENDING', 'CONFIRMED', 'ALL'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-md font-medium transition-all"
                style={{
                  backgroundColor: activeTab === tab ? 'var(--color-surface)' : 'transparent',
                  color: activeTab === tab ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  boxShadow: activeTab === tab ? 'var(--shadow-card)' : 'none',
                }}
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
          <div className="p-12 flex justify-center"><Spinner size="lg" /></div>
        ) : filteredAppts.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {activeTab === 'PENDING'   ? t('appointments.no_pending')
               : activeTab === 'CONFIRMED' ? t('appointments.no_confirmed')
               : t('appointments.no_all')}
            </p>
          </div>
        ) : (
          <div>
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
      </SectionCard>
    </div>
  );
}
