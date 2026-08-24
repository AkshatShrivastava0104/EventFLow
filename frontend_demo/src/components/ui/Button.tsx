import React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost-sm' | 'primary-sm' | 'danger' | 'danger-sm';
type ButtonSize = 'lg' | 'md' | 'sm';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-white rounded-[var(--radius-pill)] px-[14px] text-[16px] font-medium hover:bg-[#2b2b2b] active:bg-[#333] transition-colors',
  secondary:
    'bg-elevated text-ink border border-hairline rounded-[var(--radius-pill)] px-[14px] text-[16px] font-medium hover:bg-canvas transition-colors',
  'primary-sm':
    'bg-ink text-white rounded-[var(--radius-sm)] px-[6px] text-[14px] font-medium hover:bg-[#2b2b2b] transition-colors',
  'ghost-sm':
    'bg-elevated text-ink border border-hairline rounded-[var(--radius-sm)] px-[6px] text-[14px] font-medium hover:bg-canvas transition-colors',
  danger:
    'bg-error text-white rounded-[var(--radius-pill)] px-[14px] text-[16px] font-medium hover:bg-error-deep transition-colors',
  'danger-sm':
    'bg-error text-white rounded-[var(--radius-sm)] px-[6px] text-[14px] font-medium hover:bg-error-deep transition-colors',
};

const sizeClasses: Record<ButtonSize, string> = {
  lg: 'h-10',
  md: 'h-8',
  sm: 'h-7',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    children,
    className,
    disabled,
    ...props
  }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap select-none transition-all',
        'focus-visible:outline-2 focus-visible:outline-link focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
});

Button.displayName = 'Button';
