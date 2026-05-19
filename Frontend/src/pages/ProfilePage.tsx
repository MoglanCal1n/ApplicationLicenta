import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Camera, Save, Loader2, User, MapPin, Briefcase,
  CheckCircle, XCircle, Edit3, Stethoscope, HeartPulse, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

const API_BASE = 'http://localhost:8000';

/* ── Medical specializations list ──────────────────────────────────── */
const SPECIALIZATIONS_RO = [
  'Alergologie și Imunologie Clinică',
  'Anestezie și Terapie Intensivă',
  'Cardiologie',
  'Cardiologie Pediatrică',
  'Chirurgie Cardiacă',
  'Chirurgie Generală',
  'Chirurgie Orală și Maxilofacială',
  'Chirurgie Ortopedică și Traumatologie',
  'Chirurgie Pediatrică',
  'Chirurgie Plastică',
  'Chirurgie Toracică',
  'Chirurgie Vasculară',
  'Dermatologie',
  'Diabet zaharat, Nutriție și Boli Metabolice',
  'Endocrinologie',
  'Epidemiologie',
  'Gastroenterologie',
  'Gastroenterologie Pediatrică',
  'Geriatrie și Gerontologie',
  'Hematologie',
  'Hepatologie',
  'Igienă și Sănătate Publică',
  'Medicină de Familie',
  'Medicină de Urgență',
  'Medicină Internă',
  'Medicină Legală',
  'Medicină Muncii',
  'Neonatologie',
  'Nefrologie',
  'Neurochirurgie',
  'Neurologie',
  'Neurologie Pediatrică',
  'Nutriție și Dietetică',
  'Obstetrică și Ginecologie',
  'Oftalmologie',
  'Oncologie Medicală',
  'Oncologie Radioterapeutică',
  'Ortopedie Dentară',
  'Otorinolaringologie',
  'Pediatrie',
  'Pneumologie',
  'Pneumologie Pediatrică',
  'Psihiatrie',
  'Psihiatrie Pediatrică',
  'Radiologie și Imagistică Medicală',
  'Radioterapie',
  'Reumatologie',
  'Stomatologie',
  'Urologie',
];

const SPECIALIZATIONS_EN = [
  'Allergy & Clinical Immunology',
  'Anaesthesiology & Intensive Care',
  'Cardiology',
  'Paediatric Cardiology',
  'Cardiac Surgery',
  'General Surgery',
  'Oral & Maxillofacial Surgery',
  'Orthopaedic Surgery & Traumatology',
  'Paediatric Surgery',
  'Plastic Surgery',
  'Thoracic Surgery',
  'Vascular Surgery',
  'Dermatology',
  'Diabetes, Nutrition & Metabolic Diseases',
  'Endocrinology',
  'Epidemiology',
  'Gastroenterology',
  'Paediatric Gastroenterology',
  'Geriatrics & Gerontology',
  'Haematology',
  'Hepatology',
  'Hygiene & Public Health',
  'Family Medicine',
  'Emergency Medicine',
  'Internal Medicine',
  'Forensic Medicine',
  'Occupational Medicine',
  'Neonatology',
  'Nephrology',
  'Neurosurgery',
  'Neurology',
  'Paediatric Neurology',
  'Nutrition & Dietetics',
  'Obstetrics & Gynaecology',
  'Ophthalmology',
  'Medical Oncology',
  'Radiation Oncology',
  'Orthodontics',
  'Otorhinolaryngology (ENT)',
  'Paediatrics',
  'Pulmonology',
  'Paediatric Pulmonology',
  'Psychiatry',
  'Child & Adolescent Psychiatry',
  'Radiology & Medical Imaging',
  'Radiotherapy',
  'Rheumatology',
  'Dentistry & Oral Medicine',
  'Urology',
];

/* ── Toast ─────────────────────────────────────────────────────────── */
interface ToastProps { message: string; type: 'success' | 'error'; onClose: () => void; }
function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 border-l-4 rounded-xl shadow-xl text-sm font-medium max-w-sm ${type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-red-50 border-red-500 text-red-800'
      }`}>
      {type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <XCircle className="h-5 w-5 flex-shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 ml-2">&times;</button>
    </div>
  );
}

/* ── Reusable Field ─────────────────────────────────────────────────── */
function Field({ label, icon: Icon, value, onChange, required, placeholder, type = 'text' }: {
  label: string; icon: any; value: string; onChange: (v: string) => void;
  required?: boolean; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-primary" /> {label}
        {required && <span className="text-red-500 text-xs">*</span>}
      </label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary rounded-xl px-4 py-3 text-sm outline-none transition-colors"
      />
    </div>
  );
}

/* ── Specialization Dropdown ────────────────────────────────────────── */
function SpecializationSelect({ label, icon: Icon, value, onChange }: {
  label: string; icon: any; value: string; onChange: (v: string) => void;
}) {
  const { i18n } = useTranslation();
  const options = i18n.language === 'ro' ? SPECIALIZATIONS_RO : SPECIALIZATIONS_EN;

  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary rounded-xl px-4 py-3 text-sm outline-none transition-colors appearance-none pr-10"
        >
          <option value="">— {label} —</option>
          {options.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

/* ── TextArea ───────────────────────────────────────────────────────── */
function TextArea({ label, icon: Icon, value, onChange, placeholder }: {
  label: string; icon: any; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </label>
      <textarea
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary rounded-xl px-4 py-3 text-sm outline-none transition-colors resize-none"
      />
    </div>
  );
}

/* ── Language Toggle ────────────────────────────────────────────────── */
function LangToggle() {
  const { i18n } = useTranslation();
  const isRo = i18n.language === 'ro';
  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(isRo ? 'en' : 'ro')}
      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted transition-colors"
    >
      {isRo ? '🇬🇧 EN' : '🇷🇴 RO'}
    </button>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Common fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [workplace, setWorkplace] = useState('');
  // Patient-only
  const [cnp, setCnp] = useState('');
  const [knownAllergies, setKnownAllergies] = useState('');
  const [currentMedication, setCurrentMedication] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  // Doctor-only
  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  useEffect(() => {
    api.get('/profiles/me/full')
      .then(res => {
        const d = res.data;
        setProfile(d);
        setFirstName(d.first_name || '');
        setLastName(d.last_name || '');
        setAddress(d.address || '');
        setWorkplace(d.workplace || '');
        setCnp(d.cnp || '');
        setKnownAllergies(d.known_allergies || '');
        setCurrentMedication(d.current_medication || '');
        setMedicalHistory(d.medical_history || '');
        setSpecialization(d.specialization || '');
        setLicenseNumber(d.license_number || '');
      })
      .catch(() => showToast(t('profile.error_load'), 'error'))
      .finally(() => setLoading(false));
  }, [t]);

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPic(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post('/profiles/me/picture', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile((p: any) => ({ ...p, profile_picture_url: res.data.profile_picture_url }));
      showToast(t('profile.success_picture'), 'success');
    } catch {
      showToast(t('profile.error_picture'), 'error');
    } finally {
      setUploadingPic(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      showToast(t('profile.error_required'), 'error');
      return;
    }
    setSaving(true);
    try {
      await api.put('/profiles/me/user', { first_name: firstName, last_name: lastName, address, workplace });

      if (profile.role === 'PATIENT') {
        await api.put('/profiles/me/patient', {
          cnp: cnp || undefined,
          known_allergies: knownAllergies || undefined,
          current_medication: currentMedication || undefined,
          medical_history: medicalHistory || undefined,
        });
      } else if (profile.role === 'DOCTOR') {
        await api.put('/profiles/me/doctor', {
          specialization: specialization || undefined,
          license_number: licenseNumber || undefined,
        });
      }
      showToast(t('profile.success_save'), 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || t('profile.error_save'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const avatarUrl = profile?.profile_picture_url
    ? `${API_BASE}${profile.profile_picture_url}`
    : null;

  const initials = [firstName, lastName].filter(Boolean).map(s => s[0]).join('').toUpperCase() || '?';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-16">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <User className="h-5 w-5" /> {t('profile.title')}
        </h1>
        {/* Language toggle lives in the header for easy access */}
        <LangToggle />
      </header>

      <main className="max-w-2xl mx-auto p-6 mt-6">
        <form onSubmit={handleSave} className="space-y-6">

          {/* Avatar card */}
          <div className="bg-white border rounded-2xl shadow-sm p-8 flex flex-col items-center text-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-28 w-28 rounded-full object-cover border-4 border-primary/20 shadow-lg"
                />
              ) : (
                <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary to-blue-400 text-white flex items-center justify-center text-4xl font-bold shadow-lg border-4 border-primary/20">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPic}
                className="absolute bottom-0 right-0 h-9 w-9 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
              >
                {uploadingPic ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePictureChange} />
            </div>

            <div>
              <h2 className="text-2xl font-bold">
                {[firstName, lastName].filter(Boolean).join(' ') || t('profile.complete_profile')}
              </h2>
              <p className="text-muted-foreground text-sm">{profile?.email}</p>
              <span className={`mt-2 inline-block text-xs font-semibold px-3 py-1 rounded-full ${
                profile?.role === 'DOCTOR'
                  ? 'bg-blue-100 text-blue-700'
                  : profile?.role === 'ADMIN'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {profile?.role === 'DOCTOR'
                  ? t('common.role_badge_doctor')
                  : profile?.role === 'ADMIN'
                  ? '🛡️ Admin'
                  : t('common.role_badge_patient')}
              </span>
            </div>
          </div>

          {/* Personal info */}
          <div className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2 pb-2 border-b">
              <Edit3 className="h-4 w-4 text-primary" /> {t('profile.personal_info')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={t('profile.first_name')} icon={User}
                value={firstName} onChange={setFirstName}
                required placeholder={t('profile.first_name_placeholder')}
              />
              <Field
                label={t('profile.last_name')} icon={User}
                value={lastName} onChange={setLastName}
                required placeholder={t('profile.last_name_placeholder')}
              />
            </div>
            <Field
              label={t('profile.address')} icon={MapPin}
              value={address} onChange={setAddress}
              placeholder={t('profile.address_placeholder')}
            />
            <Field
              label={t('profile.workplace')} icon={Briefcase}
              value={workplace} onChange={setWorkplace}
              placeholder={t('profile.workplace_placeholder')}
            />
          </div>

          {/* Patient medical data */}
          {profile?.role === 'PATIENT' && (
            <div className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-base flex items-center gap-2 pb-2 border-b">
                <HeartPulse className="h-4 w-4 text-primary" /> {t('profile.medical_data')}
              </h3>
              <Field
                label={t('profile.cnp')} icon={User}
                value={cnp} onChange={setCnp}
                placeholder={t('profile.cnp_placeholder')}
              />
              <TextArea
                label={t('profile.known_allergies')} icon={HeartPulse}
                value={knownAllergies} onChange={setKnownAllergies}
                placeholder={t('profile.allergies_placeholder')}
              />
              <TextArea
                label={t('profile.current_medication')} icon={HeartPulse}
                value={currentMedication} onChange={setCurrentMedication}
                placeholder={t('profile.medication_placeholder')}
              />
              <TextArea
                label={t('profile.medical_history')} icon={HeartPulse}
                value={medicalHistory} onChange={setMedicalHistory}
                placeholder={t('profile.history_placeholder')}
              />
            </div>
          )}

          {/* Doctor professional data */}
          {profile?.role === 'DOCTOR' && (
            <div className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-base flex items-center gap-2 pb-2 border-b">
                <Stethoscope className="h-4 w-4 text-primary" /> {t('profile.professional_data')}
              </h3>
              {/* ✅ Specialization is now a Dropdown, not a text input */}
              <SpecializationSelect
                label={t('profile.specialization')}
                icon={Stethoscope}
                value={specialization}
                onChange={setSpecialization}
              />
              <Field
                label={t('profile.license_number')} icon={Stethoscope}
                value={licenseNumber} onChange={setLicenseNumber}
                placeholder={t('profile.license_placeholder')}
              />
            </div>
          )}

          {/* Save button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold text-base hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {saving
              ? <><Loader2 className="h-5 w-5 animate-spin" /> {t('profile.saving')}</>
              : <><Save className="h-5 w-5" /> {t('profile.save_btn')}</>}
          </button>
        </form>
      </main>
    </div>
  );
}
