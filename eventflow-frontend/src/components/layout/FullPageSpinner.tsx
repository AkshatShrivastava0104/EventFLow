import { Spinner } from '@/components/ui/Spinner';

export function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50">
      <Spinner size={28} />
    </div>
  );
}
