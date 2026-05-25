import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowLeft, Loader2, Stethoscope, CheckCircle, XCircle, ChevronRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { Toast, useToast, Spinner } from '../components/ui';

/* ─── Step indicator ─────────────────────────────────────────────────── */
function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
        style={{
          backgroundColor: done ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--color-surface-elevated)',
          color: done || active ? 'white' : 'var(--color-text-tertiary)',
        }}
      >
        {done ? <CheckCircle className="h-4 w-4" /> : n}
      </div>
      <span
        className="text-sm font-medium hidden sm:block"
        style={{ color: active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}
      >
        {label}
      </span>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function BookAppointment() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { show: showToast, ToastNode } = useToast();

  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [specializationFilter, setSpecializationFilter] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.get('/profiles/doctors');
        setDoctors(res.data);
        const specs = Array.from(new Set<string>(res.data.map((d: any) => d.specialization as string).filter(Boolean)));
        setSpecializations(specs);
      } catch {
        showToast(t('appointments.confirm_error'), 'error');
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) { setSlots([]); return; }
    setLoadingSlots(true);
    setSelectedSlot('');
    api.get('/appointments/available-slots', {
      params: { doctor_id: selectedDoctor.id, date: selectedDate }
    })
      .then(res => setSlots(res.data))
      .catch(() => showToast(t('appointments.confirm_error'), 'error'))
      .finally(() => setLoadingSlots(false));
  }, [selectedDoctor, selectedDate]);

  const filteredDoctors = specializationFilter
    ? doctors.filter(d => d.specialization === specializationFilter)
    : doctors;

  const handleSubmit = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      showToast(t('appointments.select_all_steps'), 'info');
      return;
    }
    setSubmitting(true);
    try {
      const appointmentDate = new Date(`${selectedDate}T${selectedSlot}:00`).toISOString();
      await api.post('/appointments/request', {
        doctor_id: selectedDoctor.id,
        appointment_date: appointmentDate,
      });
      showToast(t('appointments.confirm_success'), 'success');
      setTimeout(() => navigate('/ehealth/dashboard'), 2200);
    } catch (err: any) {
      showToast(err.response?.data?.detail || t('appointments.confirm_error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const cardStyle = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-card)',
  };

  const inputStyle = {
    backgroundColor: 'var(--color-surface-elevated)',
    border: '2px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {ToastNode}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/ehealth/dashboard')}
          className="p-2 rounded-xl transition-colors"
          style={{ backgroundColor: 'var(--color-surface-elevated)' }}
        >
          <ArrowLeft className="h-5 w-5" style={{ color: 'var(--color-text-secondary)' }} />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Calendar className="h-6 w-6" style={{ color: 'var(--color-primary)' }} /> {t('appointments.booking_title')}
          </h1>
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        <Step n={1} label={t('appointments.step_specialization')} active={step === 1} done={step > 1} />
        <ChevronRight className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
        <Step n={2} label={t('appointments.step_doctor')} active={step === 2} done={step > 2} />
        <ChevronRight className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
        <Step n={3} label={t('appointments.step_datetime')} active={step === 3} done={step > 3} />
      </div>

      {/* ── STEP 1: Specialization ── */}
      {step === 1 && (
        <div className="rounded-2xl p-8 space-y-6" style={cardStyle}>
          <div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{t('appointments.choose_specialization')}</h2>
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{t('appointments.choose_spec_subtitle')}</p>
          </div>

          {loadingDoctors ? (
            <div className="flex justify-center py-10"><Spinner size="lg" /></div>
          ) : specializations.length === 0 ? (
            <div className="text-center py-10" style={{ color: 'var(--color-text-tertiary)' }}>
              <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{t('appointments.no_specs')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {specializations.map(spec => (
                <button
                  key={spec}
                  onClick={() => { setSpecializationFilter(spec); setStep(2); }}
                  className="flex items-center gap-4 p-4 rounded-xl transition-all text-left group"
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    border: '2px solid transparent',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
                >
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                  >
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{spec}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      {t('appointments.doctors_available', { count: doctors.filter(d => d.specialization === spec).length })}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Doctor ── */}
      {step === 2 && (
        <div className="rounded-2xl p-8 space-y-6" style={cardStyle}>
          <div className="flex items-center gap-3">
            <button onClick={() => { setStep(1); setSelectedDoctor(null); }} className="p-2 rounded-xl" style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
              <ArrowLeft className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
            </button>
            <div>
              <h2 className="text-2xl font-bold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>{t('appointments.choose_doctor')}</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{t('appointments.choose_doctor_subtitle', { spec: specializationFilter })}</p>
            </div>
          </div>

          <div className="space-y-3">
            {filteredDoctors.map(doc => (
              <button
                key={doc.id}
                onClick={() => { setSelectedDoctor(doc); setStep(3); }}
                className="w-full flex items-center gap-4 p-5 rounded-xl transition-all text-left"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  border: '2px solid transparent',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
              >
                <div
                  className="h-12 w-12 rounded-full text-white flex items-center justify-center font-bold text-lg flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), #3B82F6)' }}
                >
                  {doc.display_name?.[0]?.toUpperCase() ?? 'D'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Dr. {doc.display_name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{doc.specialization}</p>
                  {doc.license_number && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      {t('appointments.license', { num: doc.license_number })}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 3: Date + Slot ── */}
      {step === 3 && (
        <div className="rounded-2xl p-8 space-y-6" style={cardStyle}>
          <div className="flex items-center gap-3">
            <button onClick={() => { setStep(2); setSelectedDate(''); setSlots([]); setSelectedSlot(''); }} className="p-2 rounded-xl" style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
              <ArrowLeft className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
            </button>
            <div>
              <h2 className="text-2xl font-bold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>{t('appointments.choose_datetime')}</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{t('appointments.choose_datetime_subtitle', { email: selectedDoctor?.display_name, spec: specializationFilter })}</p>
            </div>
          </div>

          {/* Date picker */}
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
              <Calendar className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('appointments.date_label')}
            </label>
            <input
              type="date"
              required
              min={todayStr}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={inputStyle}
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>

          {/* Time slots grid */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                <Clock className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('appointments.time_label')}
              </label>

              {loadingSlots ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : (
                <>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {slots.map(slot => (
                      <button
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot.time)}
                        className="py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          backgroundColor: !slot.available
                            ? 'var(--color-error-light)'
                            : selectedSlot === slot.time
                            ? 'var(--color-primary)'
                            : 'var(--color-surface-elevated)',
                          color: !slot.available
                            ? 'var(--color-error)'
                            : selectedSlot === slot.time
                            ? 'white'
                            : 'var(--color-text-primary)',
                          border: `2px solid ${!slot.available ? 'var(--color-error)' : selectedSlot === slot.time ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          opacity: !slot.available ? 0.5 : 1,
                          textDecoration: !slot.available ? 'line-through' : 'none',
                          cursor: !slot.available ? 'not-allowed' : 'pointer',
                          transform: selectedSlot === slot.time ? 'scale(1.05)' : 'scale(1)',
                          boxShadow: selectedSlot === slot.time ? 'var(--shadow-button-primary)' : 'none',
                        }}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    <span className="flex items-center gap-1"><span className="h-3 w-3 rounded inline-block" style={{ backgroundColor: 'var(--color-primary)' }} /> {t('appointments.slot_legend_selected')}</span>
                    <span className="flex items-center gap-1"><span className="h-3 w-3 rounded inline-block" style={{ backgroundColor: 'var(--color-error-light)', border: '1px solid var(--color-error)' }} /> {t('appointments.slot_legend_taken')}</span>
                    <span className="flex items-center gap-1"><span className="h-3 w-3 rounded inline-block" style={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }} /> {t('appointments.slot_legend_free')}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Summary */}
          {selectedSlot && (
            <div
              className="rounded-xl p-4 text-sm space-y-1"
              style={{
                backgroundColor: 'var(--color-primary-light)',
                border: '1px solid var(--color-primary)',
              }}
            >
              <p className="font-semibold" style={{ color: 'var(--color-primary)' }}>{t('appointments.booking_summary_title')}</p>
              <p style={{ color: 'var(--color-text-primary)' }}>👨‍⚕️ Dr. {selectedDoctor?.display_name}</p>
              <p style={{ color: 'var(--color-text-primary)' }}>📅 {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style={{ color: 'var(--color-text-primary)' }}>⏰ {selectedSlot}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedSlot}
            className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              boxShadow: 'var(--shadow-button-primary)',
            }}
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : `✅ ${t('appointments.confirm_btn')}`}
          </button>
        </div>
      )}
    </div>
  );
}
