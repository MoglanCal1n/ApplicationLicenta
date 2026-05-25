import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, Save, Loader2, User, MapPin, Briefcase,
  Edit3, Stethoscope, HeartPulse, ChevronDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useToast, SectionCard, Spinner } from '../components/ui';

const API_BASE = 'http://localhost:8000';

/* ── Medical specializations list ──────────────────────────────────── */
const SPECIALIZATIONS_RO = [
  'Alergologie și Imunologie Clinică','Anestezie și Terapie Intensivă','Cardiologie','Cardiologie Pediatrică',
  'Chirurgie Cardiacă','Chirurgie Generală','Chirurgie Orală și Maxilofacială','Chirurgie Ortopedică și Traumatologie',
  'Chirurgie Pediatrică','Chirurgie Plastică','Chirurgie Toracică','Chirurgie Vasculară','Dermatologie',
  'Diabet zaharat, Nutriție și Boli Metabolice','Endocrinologie','Epidemiologie','Gastroenterologie',
  'Gastroenterologie Pediatrică','Geriatrie și Gerontologie','Hematologie','Hepatologie','Igienă și Sănătate Publică',
  'Medicină de Familie','Medicină de Urgență','Medicină Internă','Medicină Legală','Medicină Muncii',
  'Neonatologie','Nefrologie','Neurochirurgie','Neurologie','Neurologie Pediatrică','Nutriție și Dietetică',
  'Obstetrică și Ginecologie','Oftalmologie','Oncologie Medicală','Oncologie Radioterapeutică','Ortopedie Dentară',
  'Otorinolaringologie','Pediatrie','Pneumologie','Pneumologie Pediatrică','Psihiatrie','Psihiatrie Pediatrică',
  'Radiologie și Imagistică Medicală','Radioterapie','Reumatologie','Stomatologie','Urologie',
];

const SPECIALIZATIONS_EN = [
  'Allergy & Clinical Immunology','Anaesthesiology & Intensive Care','Cardiology','Paediatric Cardiology',
  'Cardiac Surgery','General Surgery','Oral & Maxillofacial Surgery','Orthopaedic Surgery & Traumatology',
  'Paediatric Surgery','Plastic Surgery','Thoracic Surgery','Vascular Surgery','Dermatology',
  'Diabetes, Nutrition & Metabolic Diseases','Endocrinology','Epidemiology','Gastroenterology',
  'Paediatric Gastroenterology','Geriatrics & Gerontology','Haematology','Hepatology','Hygiene & Public Health',
  'Family Medicine','Emergency Medicine','Internal Medicine','Forensic Medicine','Occupational Medicine',
  'Neonatology','Nephrology','Neurosurgery','Neurology','Paediatric Neurology','Nutrition & Dietetics',
  'Obstetrics & Gynaecology','Ophthalmology','Medical Oncology','Radiation Oncology','Orthodontics',
  'Otorhinolaryngology (ENT)','Paediatrics','Pulmonology','Paediatric Pulmonology','Psychiatry',
  'Child & Adolescent Psychiatry','Radiology & Medical Imaging','Radiotherapy','Rheumatology',
  'Dentistry & Oral Medicine','Urology',
];

/* ── Reusable Field ─────────────────────────────────────────────────── */
function Field({ label, icon: Icon, value, onChange, required, placeholder, type = 'text' }: {
  label: string; icon: any; value: string; onChange: (v: string) => void;
  required?: boolean; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
        <Icon className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {label}
        {required && <span style={{ color: 'var(--color-error)' }} className="text-xs">*</span>}
      </label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
        style={{
          backgroundColor: 'var(--color-surface-elevated)',
          border: '2px solid var(--color-border)',
          color: 'var(--color-text-primary)',
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
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
      <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
        <Icon className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none pr-10"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '2px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
        >
          <option value="">— {label} —</option>
          {options.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
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
      <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
        <Icon className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {label}
      </label>
      <textarea
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none"
        style={{
          backgroundColor: 'var(--color-surface-elevated)',
          border: '2px solid var(--color-border)',
          color: 'var(--color-text-primary)',
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
      />
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { show: showToast, ToastNode } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [cnp, setCnp] = useState('');
  const [knownAllergies, setKnownAllergies] = useState('');
  const [currentMedication, setCurrentMedication] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
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
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {ToastNode}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar card */}
        <SectionCard className="p-8 flex flex-col items-center text-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-28 w-28 rounded-full object-cover"
                style={{ border: '4px solid var(--color-primary-light)', boxShadow: 'var(--shadow-card)' }}
              />
            ) : (
              <div
                className="h-28 w-28 rounded-full text-white flex items-center justify-center text-4xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary), #3B82F6)',
                  border: '4px solid var(--color-primary-light)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPic}
              className="absolute bottom-0 right-0 h-9 w-9 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white', boxShadow: 'var(--shadow-button-primary)' }}
            >
              {uploadingPic ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePictureChange} />
          </div>

          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {[firstName, lastName].filter(Boolean).join(' ') || t('profile.complete_profile')}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{profile?.email}</p>
            <span
              className="mt-2 inline-block text-xs font-semibold px-3 py-1 rounded-full"
              style={{
                backgroundColor: profile?.role === 'DOCTOR' ? 'var(--color-info-light)' : profile?.role === 'ADMIN' ? 'var(--color-warning-light)' : 'var(--color-success-light)',
                color: profile?.role === 'DOCTOR' ? 'var(--color-info)' : profile?.role === 'ADMIN' ? 'var(--color-warning)' : 'var(--color-success)',
                border: `1px solid ${profile?.role === 'DOCTOR' ? 'var(--color-info)' : profile?.role === 'ADMIN' ? 'var(--color-warning)' : 'var(--color-success)'}`,
              }}
            >
              {profile?.role === 'DOCTOR'
                ? t('common.role_badge_doctor')
                : profile?.role === 'ADMIN'
                ? '🛡️ Admin'
                : t('common.role_badge_patient')}
            </span>
          </div>
        </SectionCard>

        {/* Personal info */}
        <SectionCard className="p-6 space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2 pb-2" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
            <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('profile.personal_info')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('profile.first_name')} icon={User} value={firstName} onChange={setFirstName} required placeholder={t('profile.first_name_placeholder')} />
            <Field label={t('profile.last_name')} icon={User} value={lastName} onChange={setLastName} required placeholder={t('profile.last_name_placeholder')} />
          </div>
          <Field label={t('profile.address')} icon={MapPin} value={address} onChange={setAddress} placeholder={t('profile.address_placeholder')} />
          <Field label={t('profile.workplace')} icon={Briefcase} value={workplace} onChange={setWorkplace} placeholder={t('profile.workplace_placeholder')} />
        </SectionCard>

        {/* Patient medical data */}
        {profile?.role === 'PATIENT' && (
          <SectionCard className="p-6 space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2 pb-2" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
              <HeartPulse className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('profile.medical_data')}
            </h3>
            <Field label={t('profile.cnp')} icon={User} value={cnp} onChange={setCnp} placeholder={t('profile.cnp_placeholder')} />
            <TextArea label={t('profile.known_allergies')} icon={HeartPulse} value={knownAllergies} onChange={setKnownAllergies} placeholder={t('profile.allergies_placeholder')} />
            <TextArea label={t('profile.current_medication')} icon={HeartPulse} value={currentMedication} onChange={setCurrentMedication} placeholder={t('profile.medication_placeholder')} />
            <TextArea label={t('profile.medical_history')} icon={HeartPulse} value={medicalHistory} onChange={setMedicalHistory} placeholder={t('profile.history_placeholder')} />
          </SectionCard>
        )}

        {/* Doctor professional data */}
        {profile?.role === 'DOCTOR' && (
          <SectionCard className="p-6 space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2 pb-2" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
              <Stethoscope className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> {t('profile.professional_data')}
            </h3>
            <SpecializationSelect label={t('profile.specialization')} icon={Stethoscope} value={specialization} onChange={setSpecialization} />
            <Field label={t('profile.license_number')} icon={Stethoscope} value={licenseNumber} onChange={setLicenseNumber} placeholder={t('profile.license_placeholder')} />
          </SectionCard>
        )}

        {/* Save button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            boxShadow: 'var(--shadow-button-primary)',
          }}
        >
          {saving
            ? <><Loader2 className="h-5 w-5 animate-spin" /> {t('profile.saving')}</>
            : <><Save className="h-5 w-5" /> {t('profile.save_btn')}</>}
        </button>
      </form>
    </div>
  );
}
