import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { Stethoscope, Loader2, KeyRound } from 'lucide-react';

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

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 text-center">
        <div className="max-w-md w-full bg-card border rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-destructive mb-2">{t('reset_password.invalid_link')}</h2>
          <p className="text-muted-foreground mb-6">{t('reset_password.request_new')}</p>
          <Link to="/forgot-password" className="text-primary hover:underline font-medium">
            {t('reset_password.go_to_forgot')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md w-full bg-card border rounded-xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">{t('reset_password.title')}</h2>
          <p className="text-muted-foreground text-sm text-center mt-2">
            {t('reset_password.subtitle')}
          </p>
        </div>

        {success ? (
          <div className="bg-green-500/10 text-green-600 text-sm p-4 rounded-md mb-6 border border-green-500/20 text-center font-medium">
            {t('reset_password.success_msg')}
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-6 border border-destructive/20">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('reset_password.new_password')}</label>
                <input
                  type="password"
                  required
                  className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 transition-colors flex justify-center items-center h-10 mt-4"
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
