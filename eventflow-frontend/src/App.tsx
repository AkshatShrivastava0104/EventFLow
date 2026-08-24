import { Suspense } from 'react';
import { AppRoutes } from './routes/AppRoutes';
import { Spinner } from './components/ui/Spinner';
import { RouteErrorBoundary } from './components/common/ErrorBoundary';

export default function App() {
    return (
        <RouteErrorBoundary>
            <Suspense fallback={<div className="grid h-screen place-items-center"><Spinner size={28} /></div>}>
                <AppRoutes />
            </Suspense>
        </RouteErrorBoundary>
    );
}
