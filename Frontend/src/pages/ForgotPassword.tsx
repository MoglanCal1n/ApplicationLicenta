import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { Stethoscope, Loader2, MailCheck } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md w-full bg-card border rounded-xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <Stethoscope className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">{t('forgot_password.title')}</h2>
          <p className="text-muted-foreground text-sm text-center mt-2">
            {t('forgot_password.subtitle')}
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center text-center">
            <MailCheck className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('forgot_password.check_email')}</h3>
            <p className="text-muted-foreground mb-6">
              {t('forgot_password.email_sent_to')} <br/><span className="font-medium text-foreground">{email}</span>
            </p>
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md border border-border/50 mb-6 text-left">
              <strong>{t('forgot_password.demo_note')}</strong> {t('forgot_password.demo_desc')}
            </p>
            <Link to="/login" className="text-primary font-medium hover:underline">
              {t('forgot_password.return_login')}
            </Link>
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
                <label className="block text-sm font-medium mb-1">{t('forgot_password.email')}</label>
                <input
                  type="email"
                  required
                  className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@clinic.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 transition-colors flex justify-center items-center h-10 mt-4"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : t('forgot_password.send_btn')}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                &larr; {t('forgot_password.back_to_login')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
