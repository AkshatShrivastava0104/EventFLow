import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <Loader2 className={cn('animate-spin text-ink-500', className)} style={{ width: size, height: size }} />;
}
