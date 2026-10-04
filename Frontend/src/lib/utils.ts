import { format, formatDistanceToNow, isPast, isFuture, differenceInDays } from 'date-fns';

export function cn(...args: Array<string | number | false | null | undefined>): string {
  return args.filter(Boolean).join(' ');
}

export function fmtDate(d: string | Date, pattern = 'EEE, MMM d, yyyy'): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return format(date, pattern);
}

export function fmtTime(d: string | Date): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return format(date, 'p');
}

export function fmtRelative(d: string | Date): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return formatDistanceToNow(date, { addSuffix: true });
}

export function fmtMoney(value: number | string | null | undefined, currency = 'INR'): string {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  if (!n) return 'Free';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(n);
}

export function eventStatusLabel(status: string, startAt: string, endAt: string) {
  if (status === 'draft') return { label: 'Draft', tone: 'gray' as const };
  if (status === 'cancelled') return { label: 'Cancelled', tone: 'red' as const };
  if (status === 'completed' || (endAt && isPast(new Date(endAt)))) return { label: 'Completed', tone: 'gray' as const };
  if (startAt && isFuture(new Date(startAt))) {
    const days = differenceInDays(new Date(startAt), new Date());
    if (days <= 1) return { label: 'Starting soon', tone: 'orange' as const };
    if (days <= 7) return { label: 'This week', tone: 'blue' as const };
    return { label: 'Upcoming', tone: 'green' as const };
  }
  return { label: 'Live', tone: 'green' as const };
}

export function slugify(s: string) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
}

export function randomCode(prefix = 'TKT') {
  return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}
