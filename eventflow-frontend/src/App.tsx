import { Suspense } from 'react';
import { AppRoutes } from './routes/AppRoutes';
import { Spinner } from './components/ui/Spinner';

export default function App() {
    return (
        <Suspense fallback={<div className="grid h-screen place-items-center"><Spinner size={28} /></div>}>
            <AppRoutes />
        </Suspense>
    );
}
