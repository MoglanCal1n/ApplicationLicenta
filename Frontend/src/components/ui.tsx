/**
 * Shared UI components used across the application.
 * Centralises Toast, StatusBadge, LoadingSpinner, and ConfirmModal
 * so they are defined once and never duplicated.
 *
 * Updated for the new design system with CSS custom properties.
 */
import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/* ─── Toast ─────────────────────────────────────────────────────── */
export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  /** Auto-dismiss delay in ms. Default 5000. */
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const styles: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: {
      bg: 'var(--color-success-light)',
      border: 'var(--color-success)',
      text: 'var(--color-success)',
    },
    error: {
      bg: 'var(--color-error-light)',
      border: 'var(--color-error)',
      text: 'var(--color-error)',
    },
    info: {
      bg: 'var(--color-info-light)',
      border: 'var(--color-info)',
      text: 'var(--color-info)',
    },
  };

  const s = styles[type];
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : AlertCircle;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-xl text-sm font-medium max-w-sm animate-slide-in-right"
      style={{
        backgroundColor: s.bg,
        borderLeft: `4px solid ${s.border}`,
        color: s.text,
        boxShadow: 'var(--shadow-dropdown)',
      }}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden />
      <span className="flex-1" style={{ color: 'var(--color-text-primary)' }}>{message}</span>
      <button
        onClick={onClose}
        aria-label="Close notification"
        className="opacity-60 hover:opacity-100 transition-opacity text-xl leading-none ml-1"
      >
        &times;
      </button>
    </div>
  );
}

/* ─── useToast hook ─────────────────────────────────────────────── */
export function useToast() {
  const [toast, setToast] = React.useState<{ message: string; type: ToastType } | null>(null);

  const show = React.useCallback((message: string, type: ToastType = 'error') => {
    setToast({ message, type });
  }, []);

  const hide = React.useCallback(() => setToast(null), []);

  const ToastNode = toast ? (
    <Toast message={toast.message} type={toast.type} onClose={hide} />
  ) : null;

  return { show, ToastNode };
}

/* ─── Status Badge ───────────────────────────────────────────────── */
type AppStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'REJECTED' | 'DRAFT' | 'SIGNED';

interface StatusBadgeProps { status: AppStatus | string; }

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();

  const styles: Record<string, { bg: string; text: string; border: string }> = {
    PENDING:   { bg: 'var(--color-warning-light)', text: 'var(--color-warning)', border: 'var(--color-warning)' },
    CONFIRMED: { bg: 'var(--color-success-light)', text: 'var(--color-success)', border: 'var(--color-success)' },
    COMPLETED: { bg: 'var(--color-info-light)', text: 'var(--color-info)', border: 'var(--color-info)' },
    REJECTED:  { bg: 'var(--color-error-light)', text: 'var(--color-error)', border: 'var(--color-error)' },
    DRAFT:     { bg: 'var(--color-warning-light)', text: 'var(--color-warning)', border: 'var(--color-warning)' },
    SIGNED:    { bg: 'var(--color-success-light)', text: 'var(--color-success)', border: 'var(--color-success)' },
  };

  const labelKey: Record<string, string> = {
    PENDING:   'common.status_pending',
    CONFIRMED: 'common.status_confirmed',
    COMPLETED: 'common.status_completed',
    REJECTED:  'common.status_rejected',
    DRAFT:     'common.status_draft',
    SIGNED:    'common.status_signed',
  };

  const s = styles[status] ?? { bg: 'var(--color-surface-elevated)', text: 'var(--color-text-secondary)', border: 'var(--color-border)' };

  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      {labelKey[status] ? t(labelKey[status]) : status}
    </span>
  );
}

/* ─── Loading Spinner ───────────────────────────────────────────── */
interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string; }

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <Loader2
      className={`animate-spin ${sizes[size]} ${className}`}
      style={{ color: 'var(--color-primary)' }}
      aria-label="Loading"
    />
  );
}

/* ─── Full page loader ──────────────────────────────────────────── */
export function PageLoader() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
          Loading...
        </p>
      </div>
    </div>
  );
}

/* ─── Section Card ──────────────────────────────────────────────── */
interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}
export function SectionCard({ children, className = '' }: SectionCardProps) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {children}
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  loading?: boolean;
  highlight?: boolean;
}
export function StatCard({ label, value, icon: Icon, loading = false, highlight = false }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-5 transition-all duration-200 hover:shadow-md"
      style={{
        backgroundColor: highlight ? 'var(--color-primary-light)' : 'var(--color-surface)',
        border: `1px solid ${highlight ? 'var(--color-primary)' : 'var(--color-border)'}`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {label}
        </p>
        <Icon
          className="h-4 w-4"
          style={{ color: highlight ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}
        />
      </div>
      <p
        className="text-2xl font-bold"
        style={{ color: highlight ? 'var(--color-primary)' : 'var(--color-text-primary)' }}
      >
        {loading ? <Spinner size="sm" /> : value}
      </p>
    </div>
  );
}
