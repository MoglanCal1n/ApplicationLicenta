import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, Calendar, Loader2, Plus, Trash2, Edit2,
  Undo, AlertCircle, FileText, CheckCircle,
  XCircle, ChevronLeft, ChevronRight, RefreshCw, BarChart2
} from 'lucide-react';
import api from '../api';

/* ─── Toast Component ───────────────────────────────────────────────── */
interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}
function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 border-l-4 rounded-xl shadow-xl text-sm font-medium max-w-sm animate-in slide-in-from-right duration-300 ${
      type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-red-50 border-red-500 text-red-800'
    }`}>
      {type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 text-lg leading-none ml-2">&times;</button>
    </div>
  );
}

/* ─── Status Badges ─────────────────────────────────────────────────── */
function ApptStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING:   'bg-yellow-100 text-yellow-800 border-yellow-200',
    CONFIRMED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200',
    REJECTED:  'bg-slate-100 text-slate-800 border-slate-200',
    SCHEDULED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    CANCELLED: 'bg-red-100 text-red-800 border-red-200',
    NO_SHOW:   'bg-orange-100 text-orange-800 border-orange-200',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function ConsultStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT:  'bg-yellow-100 text-yellow-800 border-yellow-200',
    SIGNED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'APPOINTMENTS' | 'CONSULTATIONS'>('APPOINTMENTS');
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [doctorIdFilter, setDoctorIdFilter] = useState('');
  const [patientIdFilter, setPatientIdFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // Modals state
  const [apptModal, setApptModal] = useState<{ open: boolean; mode: 'create' | 'edit'; data?: any }>({ open: false, mode: 'create' });
  const [consultModal, setConsultModal] = useState<{ open: boolean; mode: 'create' | 'edit'; data?: any }>({ open: false, mode: 'create' });
  const [modalLoading, setModalLoading] = useState(false);

  // Lists of doctors and patients for dropdown selection
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch {
      showToast('Could not load statistics.', 'error');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchDoctorsAndPatients = async () => {
    try {
      const [docsRes, patsRes] = await Promise.all([
        api.get('/profiles/doctors'),
        api.get('/profiles/admin/patients')
      ]);
      setDoctorsList(docsRes.data || []);
      setPatientsList(patsRes.data || []);
    } catch (e) {
      console.error('Failed to load doctors or patients list', e);
    }
  };

  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const params: any = {
        page,
        limit,
        include_deleted: includeDeleted,
      };
      if (statusFilter) params.status = statusFilter;
      if (doctorIdFilter) params.doctor_id = parseInt(doctorIdFilter, 10);
      if (patientIdFilter) params.patient_id = parseInt(patientIdFilter, 10);
      if (dateFromFilter) params.date_from = dateFromFilter;
      if (dateToFilter) params.date_to = dateToFilter;

      if (activeTab === 'APPOINTMENTS') {
        const res = await api.get('/appointments/admin/all', { params });
        setItems(res.data.items || []);
        setTotalPages(res.data.pages || 1);
      } else {
        const res = await api.get('/admin/consultations', { params });
        setItems(res.data.items || []);
        setTotalPages(res.data.pages || 1);
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to load records.', 'error');
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, [activeTab, page, limit, statusFilter, doctorIdFilter, patientIdFilter, dateFromFilter, dateToFilter, includeDeleted]);

  useEffect(() => {
    fetchStats();
    fetchDoctorsAndPatients();
  }, [fetchStats]);

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [activeTab, statusFilter, doctorIdFilter, patientIdFilter, dateFromFilter, dateToFilter, includeDeleted]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRefresh = () => {
    fetchStats();
    fetchItems();
    showToast('Dashboard refreshed!', 'success');
  };

  // Appointment Mutations
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const payload = {
      patient_id: parseInt(formData.get('patient_id') as string, 10),
      doctor_id: parseInt(formData.get('doctor_id') as string, 10),
      appointment_date: new Date(formData.get('appointment_date') as string).toISOString(),
      status: formData.get('status') as string,
      pre_consult_audio: (formData.get('pre_consult_audio') as string) || null,
      anamnesia_draft_text: (formData.get('anamnesia_draft_text') as string) || null,
    };

    setModalLoading(true);
    try {
      if (apptModal.mode === 'create') {
        await api.post('/appointments/admin/create', payload);
        showToast('Appointment created successfully!', 'success');
      } else {
        await api.put(`/appointments/admin/${apptModal.data.id}`, payload);
        showToast('Appointment updated successfully!', 'success');
      }
      setApptModal({ open: false, mode: 'create' });
      fetchItems();
      fetchStats();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to save appointment.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteAppointment = async (id: number) => {
    if (!window.confirm(`Are you sure you want to soft-delete appointment #${id}?`)) return;
    try {
      await api.delete(`/appointments/admin/${id}`);
      showToast('Appointment soft-deleted.', 'success');
      fetchItems();
      fetchStats();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to delete appointment.', 'error');
    }
  };

  const handleRestoreAppointment = async (id: number) => {
    try {
      await api.post(`/appointments/admin/${id}/restore`);
      showToast('Appointment restored successfully!', 'success');
      fetchItems();
      fetchStats();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to restore appointment.', 'error');
    }
  };

  // Consultation Mutations
  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const apptIdVal = formData.get('appointment_id') as string;

    const payload = {
      patient_id: parseInt(formData.get('patient_id') as string, 10),
      doctor_id: parseInt(formData.get('doctor_id') as string, 10),
      appointment_id: apptIdVal ? parseInt(apptIdVal, 10) : null,
      ai_draft_transcript: (formData.get('ai_draft_transcript') as string) || null,
      final_revised_text: (formData.get('final_revised_text') as string) || null,
      structured_symptoms: (formData.get('structured_symptoms') as string) || null,
      structured_diagnosis: (formData.get('structured_diagnosis') as string) || null,
      structured_recommendations: (formData.get('structured_recommendations') as string) || null,
      structured_prescriptions: (formData.get('structured_prescriptions') as string) || null,
      status: formData.get('status') as string,
    };

    setModalLoading(true);
    try {
      if (consultModal.mode === 'create') {
        await api.post('/admin/consultations', payload);
        showToast('Consultation created successfully!', 'success');
      } else {
        await api.put(`/admin/consultations/${consultModal.data.id}`, payload);
        showToast('Consultation updated successfully!', 'success');
      }
      setConsultModal({ open: false, mode: 'create' });
      fetchItems();
      fetchStats();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to save consultation.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteConsultation = async (id: number) => {
    if (!window.confirm(`Are you sure you want to soft-delete consultation #${id}?`)) return;
    try {
      await api.delete(`/admin/consultations/${id}`);
      showToast('Consultation soft-deleted.', 'success');
      fetchItems();
      fetchStats();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to delete consultation.', 'error');
    }
  };

  const handleRestoreConsultation = async (id: number) => {
    try {
      await api.post(`/admin/consultations/${id}/restore`);
      showToast('Consultation restored successfully!', 'success');
      fetchItems();
      fetchStats();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to restore consultation.', 'error');
    }
  };

  const formatLocalDate = (isoStr: string) => {
    if (!isoStr) return '-';
    return new Date(isoStr).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            Admin Panel
          </h2>
          <p className="text-muted-foreground mt-1">Cross-system resource management, audit logs, and status controls.</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary rounded-xl font-semibold bg-white hover:bg-slate-50 transition-colors shadow-sm self-start"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Users', value: stats?.total_users, Icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Doctors / Patients', value: stats ? `${stats.total_doctors} / ${stats.total_patients}` : null, Icon: BarChart2, color: 'text-purple-600 bg-purple-50' },
          { label: 'Appointments', value: stats?.total_appointments, Icon: Calendar, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Consultations', value: stats?.total_consultations, Icon: FileText, color: 'text-emerald-600 bg-emerald-50' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between pb-2">
              <h3 className="tracking-tight text-xs font-semibold text-muted-foreground">{label}</h3>
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {loadingStats ? <Loader2 className="animate-spin h-5 w-5" /> : value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs and Create actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b gap-3 pb-3">
        <div className="flex gap-2">
          {(['APPOINTMENTS', 'CONSULTATIONS'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                activeTab === tab
                  ? 'bg-primary text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'APPOINTMENTS' ? 'Appointments (Programări)' : 'Consultations (Consultații)'}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            if (activeTab === 'APPOINTMENTS') {
              setApptModal({ open: true, mode: 'create' });
            } else {
              setConsultModal({ open: true, mode: 'create' });
            }
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary/90 transition-colors shadow-sm self-start"
        >
          <Plus className="h-4.5 w-4.5" />
          {activeTab === 'APPOINTMENTS' ? 'Add Appointment' : 'Add Consultation'}
        </button>
      </div>

      {/* Filters Form */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
          >
            <option value="">All Statuses</option>
            {activeTab === 'APPOINTMENTS' ? (
              <>
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="NO_SHOW">NO_SHOW</option>
              </>
            ) : (
              <>
                <option value="DRAFT">DRAFT</option>
                <option value="SIGNED">SIGNED</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Doctor ID</label>
          <input
            type="number"
            placeholder="e.g. 1"
            value={doctorIdFilter}
            onChange={e => setDoctorIdFilter(e.target.value)}
            className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Patient ID</label>
          <input
            type="number"
            placeholder="e.g. 3"
            value={patientIdFilter}
            onChange={e => setPatientIdFilter(e.target.value)}
            className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Date From</label>
          <input
            type="date"
            value={dateFromFilter}
            onChange={e => setDateFromFilter(e.target.value)}
            className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Date To</label>
          <input
            type="date"
            value={dateToFilter}
            onChange={e => setDateToFilter(e.target.value)}
            className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
          />
        </div>

        <div className="sm:col-span-2 md:col-span-5 flex items-center justify-between border-t pt-3 mt-1">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={e => setIncludeDeleted(e.target.checked)}
              className="rounded text-primary focus:ring-primary h-4 w-4"
            />
            Include soft-deleted records (Include înregistrări șterse)
          </label>
          {(statusFilter || doctorIdFilter || patientIdFilter || dateFromFilter || dateToFilter || includeDeleted) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setDoctorIdFilter('');
                setPatientIdFilter('');
                setDateFromFilter('');
                setDateToFilter('');
                setIncludeDeleted(false);
              }}
              className="text-xs text-red-500 font-bold hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main List */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        {loadingItems ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-slate-600">No records found matching filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-4 w-16">ID</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Doctor</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Details / Metadata</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {items.map(item => {
                  const isDeleted = item.is_deleted;
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isDeleted ? 'bg-red-50/30' : ''}`}>
                      <td className="p-4 font-bold text-slate-700">#{item.id}</td>
                      <td className="p-4">
                        <div className="font-medium">
                          {activeTab === 'APPOINTMENTS'
                            ? formatLocalDate(item.appointment_date)
                            : formatLocalDate(item.created_at)}
                        </div>
                        {isDeleted && (
                          <span className="text-[10px] bg-red-100 border border-red-200 text-red-700 px-1.5 py-0.5 rounded font-bold mt-1 inline-block">
                            DELETED
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold">Doctor ID: {item.doctor_id}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold">Patient ID: {item.patient_id}</div>
                      </td>
                      <td className="p-4">
                        {activeTab === 'APPOINTMENTS' ? (
                          <ApptStatusBadge status={item.status} />
                        ) : (
                          <ConsultStatusBadge status={item.status} />
                        )}
                      </td>
                      <td className="p-4 max-w-xs truncate">
                        {activeTab === 'APPOINTMENTS' ? (
                          <span className="text-xs text-muted-foreground italic">
                            {item.anamnesia_draft_text || 'No anamnesis draft'}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {item.ai_draft_transcript || 'No AI transcript'}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        {!isDeleted ? (
                          <>
                            <button
                              onClick={() => {
                                if (activeTab === 'APPOINTMENTS') {
                                  setApptModal({ open: true, mode: 'edit', data: item });
                                } else {
                                  setConsultModal({ open: true, mode: 'edit', data: item });
                                }
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-colors text-xs font-semibold"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (activeTab === 'APPOINTMENTS') {
                                  handleDeleteAppointment(item.id);
                                } else {
                                  handleDeleteConsultation(item.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors text-xs font-semibold"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              if (activeTab === 'APPOINTMENTS') {
                                handleRestoreAppointment(item.id);
                              } else {
                                handleRestoreConsultation(item.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-emerald-200 text-emerald-600 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-colors text-xs font-semibold"
                          >
                            <Undo className="h-3.5 w-3.5" />
                            Restore
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Appointment Edit/Create Modal */}
      {apptModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b p-5 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">
                {apptModal.mode === 'create' ? 'Create Appointment' : `Edit Appointment #${apptModal.data?.id}`}
              </h3>
              <button onClick={() => setApptModal({ open: false, mode: 'create' })} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSaveAppointment} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Doctor</label>
                  <select
                    name="doctor_id"
                    required
                    defaultValue={apptModal.data?.doctor_id || ''}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Doctor</option>
                    {doctorsList.map(doc => (
                      <option key={doc.id} value={doc.id}>ID {doc.id}: Dr. {doc.display_name} ({doc.specialization})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Patient</label>
                  <select
                    name="patient_id"
                    required
                    defaultValue={apptModal.data?.patient_id || ''}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Patient</option>
                    {patientsList.map(pat => (
                      <option key={pat.id} value={pat.id}>ID {pat.id}: CNP {pat.cnp}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Appointment Date</label>
                <input
                  type="datetime-local"
                  name="appointment_date"
                  required
                  defaultValue={apptModal.data?.appointment_date ? new Date(new Date(apptModal.data.appointment_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Status</label>
                <select
                  name="status"
                  required
                  defaultValue={apptModal.data?.status || 'PENDING'}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="NO_SHOW">NO_SHOW</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Anamnesis Draft Text</label>
                <textarea
                  name="anamnesia_draft_text"
                  rows={2}
                  defaultValue={apptModal.data?.anamnesia_draft_text || ''}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setApptModal({ open: false, mode: 'create' })}
                  className="px-5 py-2.5 border rounded-xl font-bold text-slate-700 hover:bg-slate-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 text-sm flex items-center gap-2"
                >
                  {modalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consultation Edit/Create Modal */}
      {consultModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-slate-50 border-b p-5 flex justify-between items-center flex-shrink-0">
              <h3 className="font-bold text-lg text-slate-800">
                {consultModal.mode === 'create' ? 'Create Consultation' : `Edit Consultation #${consultModal.data?.id}`}
              </h3>
              <button onClick={() => setConsultModal({ open: false, mode: 'create' })} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSaveConsultation} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Doctor</label>
                  <select
                    name="doctor_id"
                    required
                    defaultValue={consultModal.data?.doctor_id || ''}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Doctor</option>
                    {doctorsList.map(doc => (
                      <option key={doc.id} value={doc.id}>ID {doc.id}: Dr. {doc.display_name} ({doc.specialization})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Patient</label>
                  <select
                    name="patient_id"
                    required
                    defaultValue={consultModal.data?.patient_id || ''}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Patient</option>
                    {patientsList.map(pat => (
                      <option key={pat.id} value={pat.id}>ID {pat.id}: CNP {pat.cnp}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Appointment ID (Optional)</label>
                  <input
                    type="number"
                    name="appointment_id"
                    defaultValue={consultModal.data?.appointment_id || ''}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Status</label>
                  <select
                    name="status"
                    required
                    defaultValue={consultModal.data?.status || 'DRAFT'}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="SIGNED">SIGNED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">AI Draft Transcript</label>
                <textarea
                  name="ai_draft_transcript"
                  rows={2}
                  defaultValue={consultModal.data?.ai_draft_transcript || ''}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Final Revised Text</label>
                <textarea
                  name="final_revised_text"
                  rows={2}
                  defaultValue={consultModal.data?.final_revised_text || ''}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-3">Structured PDF Diagnosis Data (Ollama)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Symptoms</label>
                    <textarea
                      name="structured_symptoms"
                      rows={2}
                      defaultValue={consultModal.data?.structured_symptoms || ''}
                      className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Diagnosis</label>
                    <textarea
                      name="structured_diagnosis"
                      rows={2}
                      defaultValue={consultModal.data?.structured_diagnosis || ''}
                      className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Recommendations</label>
                    <textarea
                      name="structured_recommendations"
                      rows={2}
                      defaultValue={consultModal.data?.structured_recommendations || ''}
                      className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Prescriptions</label>
                    <textarea
                      name="structured_prescriptions"
                      rows={2}
                      defaultValue={consultModal.data?.structured_prescriptions || ''}
                      className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setConsultModal({ open: false, mode: 'create' })}
                  className="px-5 py-2.5 border rounded-xl font-bold text-slate-700 hover:bg-slate-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 text-sm flex items-center gap-2"
                >
                  {modalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
