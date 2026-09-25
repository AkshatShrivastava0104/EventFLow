import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface FieldProps { label?: string; error?: string; hint?: string; icon?: ReactNode; }

export function Input({ label, error, hint, icon, className, id, ...rest }: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const inputId = id || label?.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-600">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute inset-y-0 left-3 flex items-center text-ink-400">{icon}</div>}
        <input
          id={inputId}
          className={cn(
            'w-full h-11 rounded-lg border bg-white text-sm text-ink-900 placeholder:text-ink-400 px-3.5 transition-colors',
            icon ? 'pl-10' : null,
            error ? 'border-red-500 focus:border-red-600' : 'border-ink-200 focus:border-brand-500',
            'outline-none focus:ring-4 focus:ring-brand-100',
            className,
          )}
          {...rest}
        />
      </div>
      {hint && !error && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function TextArea({ label, error, hint, className, id, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const inputId = id || label?.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-600">{label}</label>}
      <textarea
        id={inputId}
        className={cn(
          'w-full min-h-[110px] rounded-lg border bg-white text-sm text-ink-900 placeholder:text-ink-400 p-3 transition-colors',
          error ? 'border-red-500' : 'border-ink-200 focus:border-brand-500',
          'outline-none focus:ring-4 focus:ring-brand-100',
          className,
        )}
        {...rest}
      />
      {hint && !error && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Select({ label, error, hint, className, id, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  const inputId = id || label?.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-600">{label}</label>}
      <select
        id={inputId}
        className={cn(
          'w-full h-11 rounded-lg border bg-white text-sm text-ink-900 px-3 transition-colors',
          error ? 'border-red-500' : 'border-ink-200 focus:border-brand-500',
          'outline-none focus:ring-4 focus:ring-brand-100',
          className,
        )}
        {...rest}
      >{children}</select>
      {hint && !error && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
