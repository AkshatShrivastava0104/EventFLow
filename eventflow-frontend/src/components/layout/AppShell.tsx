import { ReactNode } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';

export function AppShell({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="grid h-screen place-items-center">
        <Spinner size={28} />
      </div>
    );
  }
  return <>{children}</>;
}
