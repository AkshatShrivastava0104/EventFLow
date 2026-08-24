import {
  createContext, useCallback, useContext, useState, ReactNode,
} from 'react';
import { v4 as uuid } from '@/lib/uuid';
import { ToastViewport, ToastItem } from '@/components/ui/Toast';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  tone: ToastTone;
  duration?: number;
}

interface ToastApi {
  show: (t: Omit<Toast, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const show = useCallback((t: Omit<Toast, 'id'>) => {
    const id = uuid();
    const item: Toast = { id, ...t, duration: t.duration ?? 4500 };
    setItems(prev => [...prev, item]);
    if (item.duration && item.duration > 0) {
      setTimeout(() => remove(id), item.duration);
    }
  }, [remove]);

  const api: ToastApi = {
    show,
    success: (m, title) => show({ message: m, title, tone: 'success' }),
    error: (m, title) => show({ message: m, title, tone: 'error', duration: 6000 }),
    info: (m, title) => show({ message: m, title, tone: 'info' }),
    warning: (m, title) => show({ message: m, title, tone: 'warning' }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport>
        {items.map(t => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </ToastViewport>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
