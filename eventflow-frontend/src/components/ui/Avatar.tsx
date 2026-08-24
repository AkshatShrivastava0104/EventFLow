import { cn, initials } from '@/lib/utils';

interface Props {
  name?: string;
  src?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, src, size = 32, className }: Props) {
  const dim = { width: size, height: size, fontSize: size * 0.4 };
  if (src) {
    return (
      <img
        src={src}
        alt={name || ''}
        style={dim}
        className={cn('rounded-full object-cover', className)}
      />
    );
  }
  return (
    <div
      style={dim}
      className={cn(
        'grid place-items-center rounded-full bg-ink-900 font-medium text-white',
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
