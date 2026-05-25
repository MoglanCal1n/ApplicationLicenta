import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { Loader2, KeyRound, Lock, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError(t('reset_password.invalid_link'));
    }
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: password
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('reset_password.invalid_link'));
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-card)',
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="max-w-md w-full rounded-2xl p-8 animate-fade-in-up" style={cardStyle}>
          <div className="p-4 rounded-full inline-flex mb-4" style={{ backgroundColor: 'var(--color-error-light)' }}>
            <AlertTriangle className="h-10 w-10" style={{ color: 'var(--color-error)' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-error)' }}>
            {t('reset_password.invalid_link')}
          </h2>
          <p className="mb-6" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('reset_password.request_new')}
          </p>
          <Link to="/forgot-password" className="font-semibold hover:underline" style={{ color: 'var(--color-primary)' }}>
            {t('reset_password.go_to_forgot')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'var(--color-primary)' }} />
      </div>

      <div className="max-w-md w-full rounded-2xl p-8 relative animate-fade-in-up" style={cardStyle}>
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: 'var(--color-primary-light)' }}>
            <KeyRound className="h-8 w-8" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('reset_password.title')}
          </h1>
          <p className="text-sm text-center mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('reset_password.subtitle')}
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <div className="p-4 rounded-full mb-4" style={{ backgroundColor: 'var(--color-success-light)' }}>
              <CheckCircle className="h-12 w-12" style={{ color: 'var(--color-success)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
              {t('reset_password.success_msg')}
            </p>
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
                  {t('reset_password.new_password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
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
                    minLength={6}
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
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : t('reset_password.save_btn')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
