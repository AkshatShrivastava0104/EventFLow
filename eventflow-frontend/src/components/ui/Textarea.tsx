import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, error, className, id, ...rest }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-ink-700">{label}</label>
        )}
        <textarea
          id={id || rest.name}
          ref={ref}
          className={cn(
            'min-h-[88px] w-full rounded border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900',
            'placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/10',
            error && 'border-danger-500',
            className,
          )}
          {...rest}
        />
        {error && <p className="text-xs text-danger-600">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
