import React from 'react';
import toast, { Toaster as HotToaster } from 'react-hot-toast';
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--color-elevated)',
          color: 'var(--color-ink)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--radius-md)',
          fontSize: '14px',
          boxShadow: '0px 2px 2px rgba(0,0,0,0.05), 0px 8px 16px -4px rgba(0,0,0,0.08)',
          padding: '12px 16px',
        },
      }}
    />
  );
}

// Custom toast wrapper to use Geist styling
const toastStyles = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-link',
};

export const showToast = {
  success: (message: string) => {
    toast.custom((t) => (
      <div
        className={cn(
          'flex items-center gap-3 bg-elevated border border-hairline rounded-[var(--radius-md)] px-4 py-3 shadow-floating',
          t.visible ? 'animate-in slide-in-from-bottom-5 fade-in' : 'animate-out slide-out-to-right-5 fade-out'
        )}
      >
        <CheckCircle2 size={18} className={toastStyles.success} />
        <p className="text-[14px] font-medium text-ink m-0">{message}</p>
      </div>
    ));
  },
  error: (message: string) => {
    toast.custom((t) => (
      <div
        className={cn(
          'flex items-center gap-3 bg-elevated border border-hairline rounded-[var(--radius-md)] px-4 py-3 shadow-floating',
          t.visible ? 'animate-in slide-in-from-bottom-5 fade-in' : 'animate-out slide-out-to-right-5 fade-out'
        )}
      >
        <XCircle size={18} className={toastStyles.error} />
        <p className="text-[14px] font-medium text-ink m-0">{message}</p>
      </div>
    ));
  },
  warning: (message: string) => {
    toast.custom((t) => (
      <div
        className={cn(
          'flex items-center gap-3 bg-elevated border border-hairline rounded-[var(--radius-md)] px-4 py-3 shadow-floating',
          t.visible ? 'animate-in slide-in-from-bottom-5 fade-in' : 'animate-out slide-out-to-right-5 fade-out'
        )}
      >
        <AlertCircle size={18} className={toastStyles.warning} />
        <p className="text-[14px] font-medium text-ink m-0">{message}</p>
      </div>
    ));
  },
  info: (message: string) => {
    toast.custom((t) => (
      <div
        className={cn(
          'flex items-center gap-3 bg-elevated border border-hairline rounded-[var(--radius-md)] px-4 py-3 shadow-floating',
          t.visible ? 'animate-in slide-in-from-bottom-5 fade-in' : 'animate-out slide-out-to-right-5 fade-out'
        )}
      >
        <Info size={18} className={toastStyles.info} />
        <p className="text-[14px] font-medium text-ink m-0">{message}</p>
      </div>
    ));
  },
};
