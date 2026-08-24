import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';

interface Props {
  /** Colour of the wordmark text. Use "light" on dark backgrounds. */
  tone?: 'light' | 'dark';
  showText?: boolean;
  className?: string;
  size?: number;
}

/** EventFlow brand mark — a rounded tile with a stylised "flow" glyph. */
export function Logo({ tone = 'dark', showText = true, className, size = 32 }: Props) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className="grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 text-white shadow-soft"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-[62%] w-[62%]"
          aria-hidden="true"
        >
          <path
            d="M4 7h16M4 7l3.5 10a2 2 0 0 0 1.9 1.4h5.2a2 2 0 0 0 1.9-1.4L20 7M9 12h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showText && (
        <span
          className={cn(
            'text-lg font-semibold tracking-tight',
            tone === 'light' ? 'text-white' : 'text-ink-900',
          )}
        >
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
