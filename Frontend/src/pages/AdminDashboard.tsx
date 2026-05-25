import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, Calendar, Loader2, Plus, Trash2, Edit2,
  Undo, AlertCircle, FileText, CheckCircle,
  XCircle, ChevronLeft, ChevronRight, RefreshCw, BarChart2
} from 'lucide-react';
import api from '../api';
import { useToast, StatusBadge, StatCard, SectionCard, Spinner } from '../components/ui';

/* ─── Reusable form input / select / textarea ───────────────────── */
const inputCls = "w-full rounded-xl px-4 py-3 text-sm outline-none transition-all";
const inputStyle = {
  backgroundColor: 'var(--color-surface-elevated)',
  border: '2px solid var(--color-border)',
  color: 'var(--color-text-primary)',
};
const labelCls = "block text-xs font-bold mb-1.5";
const labelStyle = { color: 'var(--color-text-secondary)' };

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'APPOINTMENTS' | 'CONSULTATIONS'>('APPOINTMENTS');
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const { show: showToast, ToastNode } = useToast();

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

  /* ── Modal reusable parts ──────────────────────────────────────── */
  const modalOverlay = {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-overlay)',
    padding: '1rem',
  };
  const modalCard = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
  };
  const modalHeader = {
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-elevated)',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {ToastNode}

      {/* Header and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            Admin Panel
          </h2>
          <p style={{ color: 'var(--color-text-tertiary)' }} className="mt-1">Cross-system resource management, audit logs, and status controls.</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all self-start"
          style={{ border: '2px solid var(--color-primary)', color: 'var(--color-primary)', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)'; }}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={stats?.total_users ?? '…'} icon={Users} loading={loadingStats} />
        <StatCard label="Doctors / Patients" value={stats ? `${stats.total_doctors} / ${stats.total_patients}` : '…'} icon={BarChart2} loading={loadingStats} />
        <StatCard label="Appointments" value={stats?.total_appointments ?? '…'} icon={Calendar} loading={loadingStats} />
        <StatCard label="Consultations" value={stats?.total_consultations ?? '…'} icon={FileText} loading={loadingStats} />
      </div>

      {/* Tabs and Create actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex gap-2">
          {(['APPOINTMENTS', 'CONSULTATIONS'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg font-bold text-sm transition-all"
              style={{
                backgroundColor: activeTab === tab ? 'var(--color-primary)' : 'transparent',
                color: activeTab === tab ? 'white' : 'var(--color-text-secondary)',
                boxShadow: activeTab === tab ? 'var(--shadow-button-primary)' : 'none',
              }}
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
          className="flex items-center gap-1.5 px-4 py-2.5 font-semibold text-sm rounded-xl transition-colors self-start"
          style={{ backgroundColor: 'var(--color-primary)', color: 'white', boxShadow: 'var(--shadow-button-primary)' }}
        >
          <Plus className="h-4 w-4" />
          {activeTab === 'APPOINTMENTS' ? 'Add Appointment' : 'Add Consultation'}
        </button>
      </div>

      {/* Filters Form */}
      <SectionCard className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className={labelCls} style={labelStyle}>Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls} style={inputStyle}>
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
            <label className={labelCls} style={labelStyle}>Doctor ID</label>
            <input type="number" placeholder="e.g. 1" value={doctorIdFilter} onChange={e => setDoctorIdFilter(e.target.value)} className={inputCls} style={inputStyle} />
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>Patient ID</label>
            <input type="number" placeholder="e.g. 3" value={patientIdFilter} onChange={e => setPatientIdFilter(e.target.value)} className={inputCls} style={inputStyle} />
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>Date From</label>
            <input type="date" value={dateFromFilter} onChange={e => setDateFromFilter(e.target.value)} className={inputCls} style={inputStyle} />
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>Date To</label>
            <input type="date" value={dateToFilter} onChange={e => setDateToFilter(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 mt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={e => setIncludeDeleted(e.target.checked)}
              className="rounded h-4 w-4"
              style={{ accentColor: 'var(--color-primary)' }}
            />
            Include soft-deleted records
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
              className="text-xs font-bold hover:underline"
              style={{ color: 'var(--color-error)' }}
            >
              Clear filters
            </button>
          )}
        </div>
      </SectionCard>

      {/* Main List */}
      <SectionCard>
        {loadingItems ? (
          <div className="p-12 flex justify-center"><Spinner size="lg" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
            <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No records found matching filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                  {['ID', 'Date', 'Doctor', 'Patient', 'Status', 'Details / Metadata', 'Actions'].map(h => (
                    <th key={h} className={`p-4 text-xs font-bold uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const isDeleted = item.is_deleted;
                  return (
                    <tr
                      key={item.id}
                      className="transition-colors"
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: isDeleted ? 'var(--color-error-light)' : 'transparent',
                      }}
                      onMouseEnter={(e) => { if (!isDeleted) e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)'; }}
                      onMouseLeave={(e) => { if (!isDeleted) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td className="p-4 font-bold" style={{ color: 'var(--color-text-primary)' }}>#{item.id}</td>
                      <td className="p-4">
                        <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {activeTab === 'APPOINTMENTS'
                            ? formatLocalDate(item.appointment_date)
                            : formatLocalDate(item.created_at)}
                        </div>
                        {isDeleted && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-bold mt-1 inline-block"
                            style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}
                          >
                            DELETED
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Doctor ID: {item.doctor_id}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Patient ID: {item.patient_id}</div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="p-4 max-w-xs truncate">
                        <span className="text-xs italic" style={{ color: 'var(--color-text-tertiary)' }}>
                          {activeTab === 'APPOINTMENTS'
                            ? (item.anamnesia_draft_text || 'No anamnesis draft')
                            : (item.ai_draft_transcript || 'No AI transcript')}
                        </span>
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
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
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
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                              style={{ border: '1px solid var(--color-error)', color: 'var(--color-error)' }}
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            style={{ border: '1px solid var(--color-success)', color: 'var(--color-success)' }}
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
          <div className="p-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-elevated)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
              >
                <ChevronLeft className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
              >
                <ChevronRight className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Appointment Edit/Create Modal */}
      {apptModal.open && (
        <div style={modalOverlay}>
          <div className="rounded-2xl w-full max-w-lg overflow-hidden animate-fade-in-up" style={modalCard}>
            <div className="p-5 flex justify-between items-center" style={modalHeader}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                {apptModal.mode === 'create' ? 'Create Appointment' : `Edit Appointment #${apptModal.data?.id}`}
              </h3>
              <button onClick={() => setApptModal({ open: false, mode: 'create' })} className="text-2xl" style={{ color: 'var(--color-text-tertiary)' }}>&times;</button>
            </div>
            <form onSubmit={handleSaveAppointment} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} style={labelStyle}>Doctor</label>
                  <select name="doctor_id" required defaultValue={apptModal.data?.doctor_id || ''} className={inputCls} style={inputStyle}>
                    <option value="">Select Doctor</option>
                    {doctorsList.map(doc => (
                      <option key={doc.id} value={doc.id}>ID {doc.id}: Dr. {doc.display_name} ({doc.specialization})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>Patient</label>
                  <select name="patient_id" required defaultValue={apptModal.data?.patient_id || ''} className={inputCls} style={inputStyle}>
                    <option value="">Select Patient</option>
                    {patientsList.map(pat => (
                      <option key={pat.id} value={pat.id}>ID {pat.id}: CNP {pat.cnp}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls} style={labelStyle}>Appointment Date</label>
                <input
                  type="datetime-local"
                  name="appointment_date"
                  required
                  defaultValue={apptModal.data?.appointment_date ? new Date(new Date(apptModal.data.appointment_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className={labelCls} style={labelStyle}>Status</label>
                <select name="status" required defaultValue={apptModal.data?.status || 'PENDING'} className={inputCls} style={inputStyle}>
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
                <label className={labelCls} style={labelStyle}>Anamnesis Draft Text</label>
                <textarea name="anamnesia_draft_text" rows={2} defaultValue={apptModal.data?.anamnesia_draft_text || ''} className={inputCls + ' resize-none'} style={inputStyle} />
              </div>

              <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button type="button" onClick={() => setApptModal({ open: false, mode: 'create' })} className="px-5 py-2.5 rounded-xl font-bold text-sm" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={modalLoading} className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
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
        <div style={modalOverlay}>
          <div className="rounded-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col" style={modalCard}>
            <div className="p-5 flex justify-between items-center flex-shrink-0" style={modalHeader}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                {consultModal.mode === 'create' ? 'Create Consultation' : `Edit Consultation #${consultModal.data?.id}`}
              </h3>
              <button onClick={() => setConsultModal({ open: false, mode: 'create' })} className="text-2xl" style={{ color: 'var(--color-text-tertiary)' }}>&times;</button>
            </div>
            <form onSubmit={handleSaveConsultation} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} style={labelStyle}>Doctor</label>
                  <select name="doctor_id" required defaultValue={consultModal.data?.doctor_id || ''} className={inputCls} style={inputStyle}>
                    <option value="">Select Doctor</option>
                    {doctorsList.map(doc => (
                      <option key={doc.id} value={doc.id}>ID {doc.id}: Dr. {doc.display_name} ({doc.specialization})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>Patient</label>
                  <select name="patient_id" required defaultValue={consultModal.data?.patient_id || ''} className={inputCls} style={inputStyle}>
                    <option value="">Select Patient</option>
                    {patientsList.map(pat => (
                      <option key={pat.id} value={pat.id}>ID {pat.id}: CNP {pat.cnp}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} style={labelStyle}>Appointment ID (Optional)</label>
                  <input type="number" name="appointment_id" defaultValue={consultModal.data?.appointment_id || ''} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>Status</label>
                  <select name="status" required defaultValue={consultModal.data?.status || 'DRAFT'} className={inputCls} style={inputStyle}>
                    <option value="DRAFT">DRAFT</option>
                    <option value="SIGNED">SIGNED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls} style={labelStyle}>AI Draft Transcript</label>
                <textarea name="ai_draft_transcript" rows={2} defaultValue={consultModal.data?.ai_draft_transcript || ''} className={inputCls + ' resize-none'} style={inputStyle} />
              </div>

              <div>
                <label className={labelCls} style={labelStyle}>Final Revised Text</label>
                <textarea name="final_revised_text" rows={2} defaultValue={consultModal.data?.final_revised_text || ''} className={inputCls + ' resize-none'} style={inputStyle} />
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)' }} className="pt-4">
                <h4 className="font-bold text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-tertiary)' }}>Structured PDF Diagnosis Data (Ollama)</h4>
                <div className="space-y-3">
                  {['structured_symptoms', 'structured_diagnosis', 'structured_recommendations', 'structured_prescriptions'].map(field => (
                    <div key={field}>
                      <label className={labelCls} style={labelStyle}>{field.replace('structured_', '').replace(/^\w/, c => c.toUpperCase())}</label>
                      <textarea name={field} rows={2} defaultValue={consultModal.data?.[field] || ''} className={inputCls + ' resize-none'} style={inputStyle} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button type="button" onClick={() => setConsultModal({ open: false, mode: 'create' })} className="px-5 py-2.5 rounded-xl font-bold text-sm" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={modalLoading} className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
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
