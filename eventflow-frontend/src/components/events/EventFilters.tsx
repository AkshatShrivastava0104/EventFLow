import { Search } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { EVENT_STATUS } from '@/lib/constants';
import type { ListQuery } from '@/types/common';

interface Props {
  value: ListQuery;
  onChange: (v: ListQuery) => void;
}

export function EventFilters({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={value.search ?? ''}
            onChange={e => onChange({ ...value, search: e.target.value, page: 1 })}
            placeholder="Search events…"
            className="h-9 w-full rounded border border-ink-200 bg-white pl-9 pr-3 text-sm placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/10"
          />
        </div>
      </div>
      <div className="w-40">
        <Select
          value={value.status ?? ''}
          onChange={e => onChange({ ...value, status: e.target.value || undefined, page: 1 })}
          options={[
            { label: 'All statuses', value: '' },
            ...Object.entries(EVENT_STATUS).map(([k, v]) => ({ label: v.label, value: k })),
          ]}
        />
      </div>
      <div className="w-40">
        <Select
          value={value.order ?? 'desc'}
          onChange={e => onChange({ ...value, order: e.target.value as 'asc' | 'desc' })}
          options={[
            { label: 'Newest first', value: 'desc' },
            { label: 'Oldest first', value: 'asc' },
          ]}
        />
      </div>
    </div>
  );
}
