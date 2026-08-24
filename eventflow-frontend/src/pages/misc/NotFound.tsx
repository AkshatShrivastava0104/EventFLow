import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 p-6">
      <div className="text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-ink-500">
          <Compass className="h-7 w-7" />
        </span>
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-400">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
          Page not found
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-ink-500">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link to="/">
            <Button variant="outline">Go home</Button>
          </Link>
          <Link to="/app">
            <Button>Browse events</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
