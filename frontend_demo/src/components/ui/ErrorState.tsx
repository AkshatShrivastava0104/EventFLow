import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ 
  title = "Something went wrong", 
  message = "An error occurred while loading this data.", 
  onRetry,
  className
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center border border-error/20 bg-error/5 rounded-[var(--radius-md)]", className)}>
      <AlertTriangle size={32} className="text-error mb-4" />
      <h3 className="text-[16px] font-semibold text-error-deep leading-6 mb-2">{title}</h3>
      <p className="text-[14px] text-body max-w-sm mx-auto leading-5">{message}</p>
      
      {onRetry && (
        <Button 
          variant="secondary" 
          onClick={onRetry} 
          className="mt-6 border-error/30 text-error-deep hover:bg-error/10"
          leftIcon={<RefreshCw size={16} />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
}
