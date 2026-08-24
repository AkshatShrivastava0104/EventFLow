import { Component, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  /** When this value changes, a displayed error is cleared (e.g. route path). */
  resetKey?: unknown;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors in the subtree so one bad page can't white-screen
 * the entire app. Pass `resetKey` (typically the route path) to auto-recover on
 * navigation without a full reload.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: unknown) {
    // Surface for debugging; production would forward this to telemetry.
    console.error('Uncaught render error:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return <DefaultFallback error={error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-danger-50 text-danger-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold text-ink-900">Something went wrong</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          This page hit an unexpected error. You can try again, or reload if it keeps happening.
        </p>
        <p className="mt-3 truncate rounded-lg bg-ink-50 px-3 py-2 font-mono text-xs text-ink-400">
          {error.message || 'Unknown error'}
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button icon={<RotateCcw className="h-4 w-4" />} onClick={onReset}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Route-aware wrapper: clears the error automatically when the path changes. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}
