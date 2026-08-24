import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface Option { label: string; value: string; }

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[];
}

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, error, options, className, id, ...rest }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-ink-700">{label}</label>
        )}
        <select
          id={id || rest.name}
          ref={ref}
          className={cn(
            'h-9 w-full rounded border border-ink-200 bg-white px-3 text-sm text-ink-900',
            'focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/10',
            error && 'border-danger-500',
            className,
          )}
          {...rest}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-danger-600">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';
