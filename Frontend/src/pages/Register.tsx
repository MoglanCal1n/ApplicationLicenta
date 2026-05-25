import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { Stethoscope, Loader2, UserPlus, Mail, Lock, KeyRound, ArrowRight } from 'lucide-react';

export default function Register() {
  const { t } = useTranslation();
  const [role, setRole] = useState<'PATIENT' | 'DOCTOR'>('PATIENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', {
        email,
        password,
        role,
        admin_code: role === 'DOCTOR' ? adminCode : undefined,
      });
      
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--color-surface-elevated)',
    border: '2px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'var(--color-primary)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: 'var(--color-primary)' }} />
      </div>

      <div
        className="max-w-md w-full rounded-2xl p-8 relative animate-fade-in-up"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: 'var(--color-primary-light)' }}>
            <UserPlus className="h-8 w-8" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('register.title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('register.subtitle')}
          </p>
        </div>

        {/* Role Toggle */}
        <div
          className="flex p-1 rounded-xl mb-6"
          style={{ backgroundColor: 'var(--color-surface-elevated)' }}
        >
          {(['PATIENT', 'DOCTOR'] as const).map(r => (
            <button
              key={r}
              type="button"
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200"
              style={{
                backgroundColor: role === r ? 'var(--color-surface)' : 'transparent',
                color: role === r ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                boxShadow: role === r ? 'var(--shadow-card)' : 'none',
              }}
              onClick={() => setRole(r)}
            >
              {r === 'PATIENT' ? `🧑 ${t('register.patient_role')}` : `👨‍⚕️ ${t('register.doctor_role')}`}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            className="text-sm p-3 rounded-xl mb-6 flex items-center gap-2"
            style={{
              backgroundColor: 'var(--color-error-light)',
              color: 'var(--color-error)',
              border: '1px solid var(--color-error)',
            }}
          >
            <span className="text-lg">⚠</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              {t('register.email')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={inputStyle}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              {t('register.password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={inputStyle}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
              />
            </div>
          </div>

          {role === 'DOCTOR' && (
            <div className="animate-fade-in">
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                {t('register.admin_code')}
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={inputStyle}
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm flex justify-center items-center gap-2 transition-all duration-200 hover:opacity-90 disabled:opacity-50 mt-2"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              boxShadow: 'var(--shadow-button-primary)',
            }}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
              <>{t('register.create_btn')} <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full" style={{ borderTop: '1px solid var(--color-border)' }} />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 font-medium" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-tertiary)' }}>
              {t('register.or_register_with')}
            </span>
          </div>
        </div>

        {/* Google */}
        <button
          onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/google/login`}
          className="w-full py-3 rounded-xl font-medium text-sm flex justify-center items-center gap-2 transition-all hover:opacity-80"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '2px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <div className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          {t('register.already_have_account')}{' '}
          <Link to="/login" className="font-semibold hover:underline" style={{ color: 'var(--color-primary)' }}>
            {t('register.sign_in_here')}
          </Link>
        </div>
      </div>
    </div>
  );
}
