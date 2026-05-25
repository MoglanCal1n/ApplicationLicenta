import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { checkAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      await checkAuth();
      navigate('/ehealth/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || t('login.invalid_credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'var(--color-primary)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--color-primary)' }}
        />
      </div>

      <div
        className="max-w-md w-full rounded-2xl p-8 relative animate-fade-in-up"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="p-4 rounded-2xl mb-4"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
          >
            <Stethoscope className="h-8 w-8" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('login.welcome_back')}
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {t('login.subtitle')}
          </p>
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
          {/* Email */}
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('login.email')}
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: 'var(--color-text-tertiary)' }}
              />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  border: '2px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@clinic.com"
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label
                className="block text-sm font-semibold"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('login.password')}
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                {t('login.forgot_password')}
              </Link>
            </div>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: 'var(--color-text-tertiary)' }}
              />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  border: '2px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm flex justify-center items-center gap-2 transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              boxShadow: 'var(--shadow-button-primary)',
            }}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
              <>{t('login.sign_in')} <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full" style={{ borderTop: '1px solid var(--color-border)' }} />
          </div>
          <div className="relative flex justify-center text-xs">
            <span
              className="px-3 font-medium"
              style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {t('login.or_continue_with')}
            </span>
          </div>
        </div>

        {/* Google OAuth */}
        <button
          onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/google/login`}
          className="w-full py-3 rounded-xl font-medium text-sm flex justify-center items-center gap-2 transition-all duration-200 hover:opacity-80"
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

        {/* Footer link */}
        <div className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          {t('login.no_account')}{' '}
          <Link
            to="/register"
            className="font-semibold hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('login.register_here')}
          </Link>
        </div>
      </div>
    </div>
  );
}
