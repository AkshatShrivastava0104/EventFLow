// src/pages/owner/SystemHealth.tsx

import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Database,
    Gauge,
    Loader2,
    RefreshCw,
    Server,
    Wifi,
    XCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface ComponentHealth {
    status: string;
    latency_ms: number;
    message?: string;
    last_checked: string;
}

interface SystemHealth {
    status: string;
    environment: string;
    app_name: string;
    timestamp: string;
    database: ComponentHealth;
    redis: ComponentHealth;
    api: ComponentHealth;
}

interface SystemHealthResponse {
    health: SystemHealth;
}

const SystemHealth = () => {
    const {
        data,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
    } = useQuery<SystemHealthResponse>({
        queryKey: ['system-health'],
        queryFn: async () => {
            const response = await api.get<SystemHealthResponse>(
                '/system-health',
            );

            return response.data;
        },
        refetchInterval: 30000,
        staleTime: 10000,
    });

    const health = data?.health;

    const getStatusConfig = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'healthy':
                return {
                    label: 'Healthy',
                    icon: CheckCircle2,
                    container:
                        'border-emerald-200 bg-emerald-50',
                    iconContainer:
                        'bg-emerald-100 text-emerald-600',
                    text: 'text-emerald-700',
                    dot: 'bg-emerald-500',
                };

            case 'degraded':
                return {
                    label: 'Degraded',
                    icon: AlertTriangle,
                    container:
                        'border-amber-200 bg-amber-50',
                    iconContainer:
                        'bg-amber-100 text-amber-600',
                    text: 'text-amber-700',
                    dot: 'bg-amber-500',
                };

            case 'unhealthy':
                return {
                    label: 'Unhealthy',
                    icon: XCircle,
                    container:
                        'border-red-200 bg-red-50',
                    iconContainer:
                        'bg-red-100 text-red-600',
                    text: 'text-red-700',
                    dot: 'bg-red-500',
                };

            default:
                return {
                    label: 'Unknown',
                    icon: AlertTriangle,
                    container:
                        'border-ink-200 bg-ink-50',
                    iconContainer:
                        'bg-ink-100 text-ink-600',
                    text: 'text-ink-700',
                    dot: 'bg-ink-400',
                };
        }
    };

    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) {
            return '—';
        }

        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) {
            return '—';
        }

        return date.toLocaleString();
    };

    const StatusBadge = ({
        status,
    }: {
        status?: string;
    }) => {
        const config = getStatusConfig(status);
        const Icon = config.icon;

        return (
            <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${config.container} ${config.text}`}
            >
                <Icon className="h-3.5 w-3.5" />
                {config.label}
            </div>
        );
    };

    const HealthCard = ({
        title,
        description,
        health: component,
        icon: Icon,
    }: {
        title: string;
        description: string;
        health?: ComponentHealth;
        icon: typeof Database;
    }) => {
        const config = getStatusConfig(component?.status);
        const StatusIcon = config.icon;

        return (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-600">
                            <Icon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                            <h3 className="font-semibold text-ink-900">
                                {title}
                            </h3>

                            <p className="mt-0.5 text-sm text-ink-500">
                                {description}
                            </p>
                        </div>
                    </div>

                    <StatusIcon
                        className={`h-5 w-5 shrink-0 ${config.text}`}
                    />
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                            Status
                        </p>

                        <div className="mt-1">
                            <StatusBadge status={component?.status} />
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                            Latency
                        </p>

                        <div className="mt-1 flex items-center justify-end gap-1.5">
                            <Gauge className="h-4 w-4 text-ink-400" />

                            <span className="text-lg font-semibold text-ink-900">
                                {component?.latency_ms ?? '—'}
                            </span>

                            {component && (
                                <span className="text-xs text-ink-500">
                                    ms
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-5 rounded-xl bg-ink-50 px-4 py-3">
                    <p className="text-sm text-ink-600">
                        {component?.message || 'No health information available.'}
                    </p>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-ink-400">
                    <Clock3 className="h-3.5 w-3.5" />

                    <span>
                        Last checked:{' '}
                        {formatTimestamp(component?.last_checked)}
                    </span>
                </div>
            </div>
        );
    };

    const overallConfig = getStatusConfig(
        health?.status,
    );

    const OverallIcon = overallConfig.icon;

    return (
        <div className="min-h-full bg-ink-50/40">
            <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-white">
                                <Activity className="h-5 w-5" />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-ink-900">
                                    System Health
                                </h1>

                                <p className="mt-0.5 text-sm text-ink-500">
                                    Monitor EventFlow infrastructure and service health.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 shadow-sm transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''
                                }`}
                        />

                        Refresh
                    </button>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-ink-100 bg-white shadow-sm">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-ink-500" />

                            <p className="text-sm text-ink-500">
                                Checking system health...
                            </p>
                        </div>
                    </div>
                )}

                {/* Error */}
                {isError && !isLoading && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                                <XCircle className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                                <h2 className="font-semibold text-red-800">
                                    Unable to load system health
                                </h2>

                                <p className="mt-1 text-sm text-red-700">
                                    The health endpoint could not be reached.
                                    Check whether the backend is running and try again.
                                </p>

                                {error instanceof Error && (
                                    <p className="mt-2 break-all text-xs text-red-600">
                                        {error.message}
                                    </p>
                                )}

                                <button
                                    type="button"
                                    onClick={() => refetch()}
                                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Try again
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Health content */}
                {!isLoading && !isError && health && (
                    <>
                        {/* Overall status */}
                        <div
                            className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${overallConfig.container}`}
                        >
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${overallConfig.iconContainer}`}
                                    >
                                        <OverallIcon className="h-7 w-7" />
                                    </div>

                                    <div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h2 className="text-lg font-bold text-ink-900">
                                                Overall System Status
                                            </h2>

                                            <StatusBadge
                                                status={health.status}
                                            />
                                        </div>

                                        <p className="mt-1 text-sm text-ink-600">
                                            {health.status === 'healthy'
                                                ? 'All monitored services are operating normally.'
                                                : health.status === 'degraded'
                                                    ? 'One or more monitored services require attention.'
                                                    : 'Critical infrastructure dependencies are unavailable.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
                                    <div className="rounded-xl bg-white/70 px-4 py-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                                            Application
                                        </p>

                                        <p className="mt-1 truncate font-semibold text-ink-900">
                                            {health.app_name || 'EventFlow'}
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-white/70 px-4 py-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                                            Environment
                                        </p>

                                        <p className="mt-1 capitalize font-semibold text-ink-900">
                                            {health.environment || '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Components */}
                        <div>
                            <div className="mb-4">
                                <h2 className="text-lg font-bold text-ink-900">
                                    Service Health
                                </h2>

                                <p className="mt-1 text-sm text-ink-500">
                                    Live health checks for core EventFlow dependencies.
                                </p>
                            </div>

                            <div className="grid gap-5 lg:grid-cols-3">
                                <HealthCard
                                    title="API"
                                    description="Backend application"
                                    health={health.api}
                                    icon={Server}
                                />

                                <HealthCard
                                    title="PostgreSQL"
                                    description="Primary database"
                                    health={health.database}
                                    icon={Database}
                                />

                                <HealthCard
                                    title="Redis"
                                    description="Cache and queue infrastructure"
                                    health={health.redis}
                                    icon={Wifi}
                                />
                            </div>
                        </div>

                        {/* Last update */}
                        <div className="flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 text-sm text-ink-500">
                                <Clock3 className="h-4 w-4" />

                                <span>
                                    Last system check:{' '}
                                    <span className="font-medium text-ink-700">
                                        {formatTimestamp(health.timestamp)}
                                    </span>
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-ink-400">
                                <span
                                    className={`h-2 w-2 rounded-full ${overallConfig.dot}`}
                                />

                                <span>
                                    Automatic refresh every 30 seconds
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SystemHealth;