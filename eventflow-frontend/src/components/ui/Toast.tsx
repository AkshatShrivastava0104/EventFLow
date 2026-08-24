import { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Toast as ToastData, ToastTone } from '@/contexts/ToastContext';

const toneClass: Record<ToastTone, string> = {
  success: 'border-success-500/30 bg-white',
  error: 'border-danger-500/30 bg-white',
  info: 'border-ink-200 bg-white',
  warning: 'border-warning-500/30 bg-white',
};

const iconClass: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success-600" />,
  error: <AlertCircle className="h-5 w-5 text-danger-600" />,
  info: <Info className="h-5 w-5 text-accent-600" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning-600" />,
};

export function ToastViewport({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-end justify-end gap-2 p-4 sm:p-6">
      {children}
    </div>
  );
}

export function ToastItem({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white p-3 shadow-pop',
        toneClass[toast.tone],
      )}
    >
      <div className="mt-0.5">{iconClass[toast.tone]}</div>
      <div className="flex-1">
        {toast.title && <p className="text-sm font-semibold text-ink-900">{toast.title}</p>}
        <p className="text-sm text-ink-600">{toast.message}</p>
      </div>
      <button onClick={onClose} className="text-ink-400 hover:text-ink-700">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
