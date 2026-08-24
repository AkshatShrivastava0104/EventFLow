import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function ForbiddenPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-4 text-center">
      <div>
        <p className="text-6xl font-bold text-ink-900">403</p>
        <h1 className="mt-2 text-lg font-semibold text-ink-900">Access denied</h1>
        <p className="mt-1 text-sm text-ink-500">You don’t have permission to view this page.</p>
        <div className="mt-6"><Link to="/"><Button>Go home</Button></Link></div>
      </div>
    </div>
  );
}
