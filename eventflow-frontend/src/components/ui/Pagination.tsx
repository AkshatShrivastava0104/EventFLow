import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onChange, className }: Props) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <p className="text-sm text-ink-500">Page {page} of {totalPages}</p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline" size="sm"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p, i) => {
          const prev = pages[i - 1];
          const showEllipsis = prev && p - prev > 1;
          return (
            <span key={p} className="flex items-center gap-1">
              {showEllipsis && <span className="px-1 text-ink-400">…</span>}
              <button
                onClick={() => onChange(p)}
                className={cn(
                  'h-8 min-w-[2rem] rounded px-2 text-sm',
                  p === page
                    ? 'bg-ink-900 text-white'
                    : 'text-ink-700 hover:bg-ink-100',
                )}
              >{p}</button>
            </span>
          );
        })}
        <Button
          variant="outline" size="sm"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
