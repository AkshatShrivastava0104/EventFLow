import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  XCircle,
  Zap,
} from 'lucide-react';
import { systemApi } from '@/api/system';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const UP_VALUES = new Set(['ok', 'up', 'healthy', 'connected', 'ready', 'available']);
const isUp = (value?: string) => !!value && UP_VALUES.has(value.toLowerCase());

function StatusTile({
  icon,
  name,
  value,
  up,
}: {
  icon: React.ReactNode;
  name: string;
  value: string;
  up: boolean;
}) {
  return (
    <Card className="flex items-center gap-4">
      <span
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
          up ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-600',
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-900">{name}</p>
        <p className="text-xs text-ink-500">{value || 'unknown'}</p>
      </div>
      {up ? (
        <Badge tone="success">
          <CheckCircle2 className="h-3 w-3" /> Up
        </Badge>
      ) : (
        <Badge tone="danger">
          <XCircle className="h-3 w-3" /> Down
        </Badge>
      )}
    </Card>
  );
}

export function SystemHealth() {
  const health = useQuery({
    queryKey: ['system', 'health'],
    queryFn: () => systemApi.health(),
    refetchInterval: 15_000,
    retry: false,
  });
  const ready = useQuery({
    queryKey: ['system', 'ready'],
    queryFn: () => systemApi.ready(),
    refetchInterval: 15_000,
    retry: false,
  });

  const apiUp = !health.isError && isUp(health.data?.status);
  const dbUp = !ready.isError && isUp(ready.data?.database);
  const redisUp = !ready.isError && isUp(ready.data?.redis);
  const allUp = apiUp && dbUp && redisUp;

  const refetchAll = () => {
    health.refetch();
    ready.refetch();
  };

  return (
    <div>
      <PageHeader
        title="System health"
        description="Live status of platform dependencies. Auto-refreshes every 15 seconds."
        actions={
          <Button
            variant="outline"
            onClick={refetchAll}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        }
      />

      {allUp ? (
        <Alert tone="success" title="All systems operational" className="mb-6">
          Every dependency is responding normally.
        </Alert>
      ) : (
        <Alert tone="danger" title="Degraded service" className="mb-6">
          One or more dependencies are not responding. Check the tiles below.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatusTile
          icon={<Server className="h-5 w-5" />}
          name="API server"
          value={health.isError ? 'unreachable' : health.data?.status ?? '…'}
          up={apiUp}
        />
        <StatusTile
          icon={<Database className="h-5 w-5" />}
          name="PostgreSQL"
          value={ready.isError ? 'unreachable' : ready.data?.database ?? '…'}
          up={dbUp}
        />
        <StatusTile
          icon={<Zap className="h-5 w-5" />}
          name="Redis"
          value={ready.isError ? 'unreachable' : ready.data?.redis ?? '…'}
          up={redisUp}
        />
      </div>

      <div className="mt-6">
        <Card>
          <div className="flex items-center gap-2 text-sm text-ink-600">
            <Activity className="h-4 w-4 text-ink-400" />
            <span>
              Readiness probe:{' '}
              <span className={cn('font-medium', ready.data?.ok ? 'text-success-700' : 'text-danger-600')}>
                {ready.isLoading ? 'checking…' : ready.data?.ok ? 'HTTP 200 · ready' : 'HTTP 503 · not ready'}
              </span>
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
