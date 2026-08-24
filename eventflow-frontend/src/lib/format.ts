import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const fmtDateTime = (iso?: string | null) =>
  iso ? format(parseISO(iso), 'MMM d, yyyy · h:mm a') : '—';

export const fmtDate = (iso?: string | null) =>
  iso ? format(parseISO(iso), 'MMM d, yyyy') : '—';

export const fmtTime = (iso?: string | null) =>
  iso ? format(parseISO(iso), 'h:mm a') : '—';

export const fmtRelative = (iso?: string | null) =>
  iso ? formatDistanceToNow(parseISO(iso), { addSuffix: true }) : '—';

export const fmtNumber = (n?: number | null) => {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat().format(n);
};
