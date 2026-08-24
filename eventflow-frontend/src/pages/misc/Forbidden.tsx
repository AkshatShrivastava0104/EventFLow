import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useHomePath } from '@/routes/ProtectedRoute';

export function Forbidden() {
  const home = useHomePath();
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 p-6">
      <div className="text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-danger-50 text-danger-600">
          <ShieldAlert className="h-7 w-7" />
        </span>
        <p className="text-sm font-semibold uppercase tracking-wide text-danger-600">403</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
          Access denied
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-ink-500">
          You don&apos;t have permission to view this area. If you think this is a
          mistake, contact your administrator.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link to={home}>
            <Button>Back to dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
