/**
 * Shared UI components used across the application.
 * Centralises Toast, StatusBadge, LoadingSpinner, and ConfirmModal
 * so they are defined once and never duplicated.
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

  const styles: Record<ToastType, string> = {
    success: 'bg-emerald-50 border-emerald-500 text-emerald-900',
    error:   'bg-red-50   border-red-500   text-red-900',
    info:    'bg-blue-50  border-blue-500  text-blue-900',
  };

  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : AlertCircle;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 border-l-4 rounded-xl shadow-xl text-sm font-medium max-w-sm animate-in slide-in-from-right-2 duration-300 ${styles[type]}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden />
      <span className="flex-1">{message}</span>
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

  const styles: Record<string, string> = {
    PENDING:   'bg-yellow-100 text-yellow-800 border-yellow-200',
    CONFIRMED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200',
    REJECTED:  'bg-red-100 text-red-800 border-red-200',
    DRAFT:     'bg-yellow-100 text-yellow-800 border-yellow-200',
    SIGNED:    'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  const labelKey: Record<string, string> = {
    PENDING:   'common.status_pending',
    CONFIRMED: 'common.status_confirmed',
    COMPLETED: 'common.status_completed',
    REJECTED:  'common.status_rejected',
    DRAFT:     'common.status_draft',
    SIGNED:    'common.status_signed',
  };

  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {labelKey[status] ? t(labelKey[status]) : status}
    </span>
  );
}

/* ─── Loading Spinner ───────────────────────────────────────────── */
interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string; }

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return <Loader2 className={`animate-spin text-primary ${sizes[size]} ${className}`} aria-label="Loading" />;
}

/* ─── Full page loader ──────────────────────────────────────────── */
export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
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
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  highlight?: boolean;
}
export function StatCard({ label, value, icon: Icon, loading = false, highlight = false }: StatCardProps) {
  return (
    <div className={`border rounded-xl p-5 shadow-sm transition-colors ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${highlight ? 'text-amber-500' : 'text-muted-foreground'}`} />
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-amber-700' : 'text-foreground'}`}>
        {loading ? <Spinner size="sm" /> : value}
      </p>
    </div>
  );
}
