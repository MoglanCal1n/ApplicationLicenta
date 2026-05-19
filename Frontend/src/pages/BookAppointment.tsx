import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, ArrowLeft, Loader2, Stethoscope, CheckCircle, XCircle, ChevronRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

/* ─── Toast Component ───────────────────────────────────────────────── */
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = {
    success: 'bg-emerald-50 border-emerald-400 text-emerald-800',
    error:   'bg-red-50 border-red-400 text-red-800',
    info:    'bg-blue-50 border-blue-400 text-blue-800',
  };
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : AlertCircle;

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 border-l-4 rounded-xl shadow-xl max-w-sm animate-in slide-in-from-right duration-300 ${styles[type]}`}>
      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1 text-sm font-medium">{message}</div>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity text-lg leading-none">&times;</button>
    </div>
  );
}

/* ─── Step indicator ─────────────────────────────────────────────────── */
function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
        done  ? 'bg-emerald-500 text-white' :
        active ? 'bg-primary text-primary-foreground' :
                 'bg-muted text-muted-foreground'
      }`}>
        {done ? <CheckCircle className="h-4 w-4" /> : n}
      </div>
      <span className={`text-sm font-medium hidden sm:block ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function BookAppointment() {
  const navigate = useNavigate();

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'error') => setToast({ message, type });

  // Step: 1 = specialization, 2 = doctor, 3 = date + slot
  const [step, setStep] = useState(1);

  // Data
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

  // Today as YYYY-MM-DD for min date
  const todayStr = new Date().toISOString().split('T')[0];

  /* Fetch all doctors on mount */
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.get('/profiles/doctors');
        setDoctors(res.data);
        const specs = Array.from(new Set<string>(res.data.map((d: any) => d.specialization as string).filter(Boolean)));
        setSpecializations(specs);
      } catch (err: any) {
        showToast('Nu s-a putut încărca lista de doctori. Încearcă din nou.', 'error');
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  /* Fetch slots when doctor + date change */
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) { setSlots([]); return; }
    setLoadingSlots(true);
    setSelectedSlot('');
    api.get('/appointments/available-slots', {
      params: { doctor_id: selectedDoctor.id, date: selectedDate }
    })
      .then(res => setSlots(res.data))
      .catch(() => showToast('Nu s-au putut încărca orele disponibile.', 'error'))
      .finally(() => setLoadingSlots(false));
  }, [selectedDoctor, selectedDate]);

  /* Filtered doctors by specialization */
  const filteredDoctors = specializationFilter
    ? doctors.filter(d => d.specialization === specializationFilter)
    : doctors;

  /* Submit */
  const handleSubmit = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      showToast('Completează toți pașii înainte de a confirma.', 'info');
      return;
    }
    setSubmitting(true);
    try {
      const appointmentDate = new Date(`${selectedDate}T${selectedSlot}:00`).toISOString();
      await api.post('/appointments/request', {
        doctor_id: selectedDoctor.id,
        appointment_date: appointmentDate,
      });
      showToast('Programare trimisă cu succes! Doctorul o va confirma în curând.', 'success');
      setTimeout(() => navigate('/dashboard'), 2200);
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'A apărut o eroare la trimiterea programării.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 pb-16">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Calendar className="h-5 w-5" /> Programează o Consultație
        </h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 mt-6">

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          <Step n={1} label="Specializare" active={step === 1} done={step > 1} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Step n={2} label="Doctor" active={step === 2} done={step > 2} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Step n={3} label="Data & Ora" active={step === 3} done={step > 3} />
        </div>

        {/* ── STEP 1: Specialization ── */}
        {step === 1 && (
          <div className="bg-white border rounded-2xl shadow-sm p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Alege Specializarea</h2>
              <p className="text-muted-foreground text-sm">Selectează tipul de consultație de care ai nevoie.</p>
            </div>

            {loadingDoctors ? (
              <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : specializations.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nu există niciun doctor înregistrat încă.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {specializations.map(spec => (
                  <button
                    key={spec}
                    onClick={() => { setSpecializationFilter(spec); setStep(2); }}
                    className="flex items-center gap-4 p-4 border-2 border-transparent rounded-xl bg-slate-50 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{spec}</p>
                      <p className="text-xs text-muted-foreground">
                        {doctors.filter(d => d.specialization === spec).length} doctor(i) disponibili
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Doctor ── */}
        {step === 2 && (
          <div className="bg-white border rounded-2xl shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={() => { setStep(1); setSelectedDoctor(null); }} className="p-2 hover:bg-muted rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-2xl font-bold mb-0.5">Alege Doctorul</h2>
                <p className="text-muted-foreground text-sm">Specializare: <strong>{specializationFilter}</strong></p>
              </div>
            </div>

            <div className="space-y-3">
              {filteredDoctors.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedDoctor(doc); setStep(3); }}
                  className="w-full flex items-center gap-4 p-5 border-2 border-transparent rounded-xl bg-slate-50 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-blue-400 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {doc.display_name?.[0]?.toUpperCase() ?? 'D'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Dr. {doc.display_name}</p>
                    <p className="text-xs text-muted-foreground">{doc.specialization}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Date + Slot ── */}
        {step === 3 && (
          <div className="bg-white border rounded-2xl shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={() => { setStep(2); setSelectedDate(''); setSlots([]); setSelectedSlot(''); }} className="p-2 hover:bg-muted rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-2xl font-bold mb-0.5">Alege Data & Ora</h2>
                <p className="text-muted-foreground text-sm">Dr. {selectedDoctor?.display_name} · {specializationFilter}</p>
              </div>
            </div>

            {/* Date picker */}
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Data Consultației
              </label>
              <input
                type="date"
                required
                min={todayStr}
                className="w-full bg-slate-50 border-2 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>

            {/* Time slots grid */}
            {selectedDate && (
              <div>
                <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Ore disponibile
                </label>

                {loadingSlots ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {slots.map(slot => (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                            !slot.available
                              ? 'bg-red-50 border-red-200 text-red-300 line-through cursor-not-allowed'
                              : selectedSlot === slot.time
                              ? 'bg-primary border-primary text-primary-foreground shadow-md scale-105'
                              : 'bg-slate-50 border-slate-200 hover:border-primary hover:bg-primary/5 text-foreground'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-primary inline-block"></span> Selectat</span>
                      <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-100 border border-red-200 inline-block"></span> Ocupat</span>
                      <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-slate-100 border border-slate-200 inline-block"></span> Disponibil</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Summary card */}
            {selectedSlot && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm space-y-1">
                <p className="font-semibold text-primary">Rezumat programare:</p>
                <p>👨‍⚕️ Dr. {selectedDoctor?.display_name}</p>
                <p>📅 {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p>⏰ {selectedSlot}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedSlot}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : '✅ Confirmă Programarea'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
