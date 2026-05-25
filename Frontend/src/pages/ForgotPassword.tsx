import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { Stethoscope, Loader2, MailCheck, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { email, language: i18n.language });
      setSuccess(true);
    } catch (err: any) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'var(--color-primary)' }} />
      </div>

      <div
        className="max-w-md w-full rounded-2xl p-8 relative animate-fade-in-up"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: 'var(--color-primary-light)' }}>
            <Stethoscope className="h-8 w-8" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('forgot_password.title')}
          </h1>
          <p className="text-sm text-center mt-2 max-w-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('forgot_password.subtitle')}
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <div className="p-4 rounded-full mb-4" style={{ backgroundColor: 'var(--color-success-light)' }}>
              <MailCheck className="h-12 w-12" style={{ color: 'var(--color-success)' }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {t('forgot_password.check_email')}
            </h3>
            <p className="mb-6" style={{ color: 'var(--color-text-tertiary)' }}>
              {t('forgot_password.email_sent_to')} <br/>
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{email}</span>
            </p>
            <div
              className="text-xs p-4 rounded-xl mb-6 text-left"
              style={{
                backgroundColor: 'var(--color-warning-light)',
                border: '1px solid var(--color-warning)',
                color: 'var(--color-text-primary)',
              }}
            >
              <strong>{t('forgot_password.demo_note')}</strong> {t('forgot_password.demo_desc')}
            </div>
            <Link
              to="/login"
              className="font-semibold hover:underline text-sm"
              style={{ color: 'var(--color-primary)' }}
            >
              {t('forgot_password.return_login')}
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div
                className="text-sm p-3 rounded-xl mb-6"
                style={{
                  backgroundColor: 'var(--color-error-light)',
                  color: 'var(--color-error)',
                  border: '1px solid var(--color-error)',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('forgot_password.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm flex justify-center items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  boxShadow: 'var(--shadow-button-primary)',
                }}
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : t('forgot_password.send_btn')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-sm font-medium hover:underline inline-flex items-center gap-1"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {t('forgot_password.back_to_login')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
