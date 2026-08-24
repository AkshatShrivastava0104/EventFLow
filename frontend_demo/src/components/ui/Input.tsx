import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[14px] font-medium text-ink leading-5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full bg-elevated text-ink border border-hairline rounded-[var(--radius-sm)]',
          'px-3 py-2 text-[14px] leading-5',
          'placeholder:text-faint',
          'focus:outline-2 focus:outline-link focus:outline-offset-0 focus:border-link',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors',
          error && 'border-error focus:outline-error',
          className
        )}
        {...props}
      />
      {error && <p className="text-[12px] text-error leading-4">{error}</p>}
      {hint && !error && <p className="text-[12px] text-mute leading-4">{hint}</p>}
    </div>
  );
});
Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[14px] font-medium text-ink leading-5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'w-full bg-elevated text-ink border border-hairline rounded-[var(--radius-sm)]',
          'px-3 py-2 text-[14px] leading-5 resize-y min-h-[80px]',
          'placeholder:text-faint',
          'focus:outline-2 focus:outline-link focus:outline-offset-0 focus:border-link',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors',
          error && 'border-error focus:outline-error',
          className
        )}
        {...props}
      />
      {error && <p className="text-[12px] text-error leading-4">{error}</p>}
      {hint && !error && <p className="text-[12px] text-mute leading-4">{hint}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';
