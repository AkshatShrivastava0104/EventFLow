import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import type { Pagination as PaginationType } from '@/types';

interface PaginationProps {
  data: PaginationType;
  onPageChange: (page: number) => void;
}

export function Pagination({ data, onPageChange }: PaginationProps) {
  if (data.total_pages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-hairline py-4 px-2 mt-4">
      <div className="text-[14px] text-mute">
        Showing page <span className="font-medium text-ink">{data.page}</span> of{' '}
        <span className="font-medium text-ink">{data.total_pages}</span> 
        {' '}·{' '} <span className="font-medium text-ink">{data.total}</span> total
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost-sm"
          onClick={() => onPageChange(data.page - 1)}
          disabled={data.page <= 1}
          leftIcon={<ChevronLeft size={16} />}
        >
          Previous
        </Button>
        <Button
          variant="ghost-sm"
          onClick={() => onPageChange(data.page + 1)}
          disabled={data.page >= data.total_pages}
          rightIcon={<ChevronRight size={16} />}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
