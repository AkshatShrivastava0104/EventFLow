import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Bell,
    CheckCircle2,
    Info,
    AlertTriangle,
    Calendar,
    ShieldAlert,
    Server,
    Database,
    Users,
    Ticket,
    UserPlus,
    Building2,
    Activity,
    Search,
    CheckCheck,
    XCircle,
    Clock3,
} from 'lucide-react';
import { NotificationsAPI } from '../../lib/queries';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { fmtRelative } from '../../lib/utils';
import { Link } from 'react-router-dom';

type NotificationItem = {
    id: number;
    user_id?: number;
    type: string;
    message: string;
    status?: 'unread' | 'read' | string;
    created_at: string;
    title?: string;
    link?: string;
    read?: boolean;
};

type NotificationCategory =
    | 'all'
    | 'unread'
    | 'system'
    | 'security'
    | 'events'
    | 'registrations';

function normalizeNotifications(value: unknown): NotificationItem[] {
    if (Array.isArray(value)) {
        return value as NotificationItem[];
    }

    if (value && typeof value === 'object') {
        const response = value as {
            data?: unknown;
            notifications?: unknown;
        };

        if (Array.isArray(response.data)) {
            return response.data as NotificationItem[];
        }

        if (Array.isArray(response.notifications)) {
            return response.notifications as NotificationItem[];
        }
    }

    return [];
}

function isNotificationUnread(notification: NotificationItem) {
    if (typeof notification.status === 'string') {
        return notification.status.toLowerCase() === 'unread';
    }

    return notification.read === false;
}

function normalizeType(type: string) {
    return type.trim().toUpperCase();
}

function getNotificationTitle(notification: NotificationItem) {
    if (notification.title?.trim()) {
        return notification.title;
    }

    switch (normalizeType(notification.type)) {
        case 'SUCCESS':
            return 'Successful operation';

        case 'WARNING':
            return 'Important update';

        case 'INFO':
            return 'Platform update';

        case 'EVENT':
            return 'Event update';

        case 'EVENT_CREATED':
            return 'New event created';

        case 'EVENT_PUBLISHED':
            return 'Event published';

        case 'EVENT_UPDATED':
            return 'Event updated';

        case 'EVENT_CANCELLED':
            return 'Event cancelled';

        case 'EVENT_CAPACITY_REACHED':
        case 'CAPACITY_REACHED':
            return 'Event capacity reached';

        case 'EVENT_STARTING_SOON':
            return 'Event starting soon';

        case 'REGISTRATION':
            return 'Registration update';

        case 'REGISTRATION_CREATED':
            return 'New registration';

        case 'REGISTRATION_CANCELLED':
            return 'Registration cancelled';

        case 'PAYMENT_SUCCESSFUL':
            return 'Payment successful';

        case 'PAYMENT_FAILED':
            return 'Payment failed';

        case 'TICKET':
            return 'Ticket update';

        case 'TICKET_CREATED':
            return 'Ticket generated';

        case 'TICKET_CHECKED_IN':
        case 'CHECKIN':
        case 'CHECKED_IN':
            return 'Attendee checked in';

        case 'WAITLIST':
            return 'Waitlist update';

        case 'WAITLIST_JOINED':
            return 'New waitlist entry';

        case 'WAITLIST_PROMOTED':
            return 'Waitlist attendee promoted';

        case 'ORGANIZATION_CREATED':
            return 'New organization created';

        case 'ORGANIZATION_UPDATED':
            return 'Organization updated';

        case 'ORGANIZATION_DELETED':
            return 'Organization deleted';

        case 'ADMIN_ASSIGNED':
        case 'ADMIN_ROLE_CHANGED':
            return 'Administrator access changed';

        case 'STAFF_ADDED':
            return 'Staff member added';

        case 'STAFF_REMOVED':
            return 'Staff member removed';

        case 'STAFF_ROLE_CHANGED':
            return 'Staff role changed';

        case 'SYSTEM_HEALTH':
        case 'SYSTEM_WARNING':
            return 'System health warning';

        case 'DATABASE_UNHEALTHY':
            return 'Database health warning';

        case 'DATABASE_RECOVERED':
            return 'Database recovered';

        case 'REDIS_UNHEALTHY':
            return 'Redis health warning';

        case 'REDIS_RECOVERED':
            return 'Redis recovered';

        case 'API_UNHEALTHY':
            return 'API health warning';

        case 'SERVICE_RECOVERED':
            return 'Service recovered';

        case 'QUEUE_FAILURE':
        case 'OUTBOX_FAILURE':
            return 'Background processing issue';

        case 'NOTIFICATION_FAILURE':
            return 'Notification delivery issue';

        case 'SECURITY_ALERT':
            return 'Security alert';

        case 'FAILED_LOGIN_SPIKE':
            return 'Login security alert';

        case 'UNAUTHORIZED_ACCESS':
        case 'UNAUTHORIZED_ACCESS_ATTEMPT':
            return 'Unauthorized access attempt';

        case 'SESSION_REVOKED':
            return 'User sessions revoked';

        case 'PASSWORD_CHANGED':
            return 'Password changed';

        default:
            return 'Platform notification';
    }
}

function getCategory(type: string): Exclude<NotificationCategory, 'all' | 'unread'> {
    const normalized = normalizeType(type);

    if (
        normalized.includes('SECURITY') ||
        normalized.includes('LOGIN') ||
        normalized.includes('UNAUTHORIZED') ||
        normalized.includes('SESSION') ||
        normalized.includes('PASSWORD')
    ) {
        return 'security';
    }

    if (
        normalized.includes('SYSTEM') ||
        normalized.includes('DATABASE') ||
        normalized.includes('REDIS') ||
        normalized.includes('API_') ||
        normalized.includes('SERVICE') ||
        normalized.includes('QUEUE') ||
        normalized.includes('OUTBOX') ||
        normalized.includes('NOTIFICATION_FAILURE')
    ) {
        return 'system';
    }

    if (
        normalized.includes('REGISTRATION') ||
        normalized.includes('PAYMENT') ||
        normalized.includes('WAITLIST')
    ) {
        return 'registrations';
    }

    if (
        normalized.includes('EVENT') ||
        normalized === 'EVENT' ||
        normalized.includes('TICKET') ||
        normalized.includes('CHECKIN') ||
        normalized.includes('CHECKED_IN')
    ) {
        return 'events';
    }

    return 'system';
}

function getNotificationIcon(type: string) {
    const normalized = normalizeType(type);

    if (
        normalized.includes('SECURITY') ||
        normalized.includes('LOGIN') ||
        normalized.includes('UNAUTHORIZED') ||
        normalized.includes('SESSION') ||
        normalized.includes('PASSWORD')
    ) {
        return <ShieldAlert className="h-4 w-4" />;
    }

    if (
        normalized.includes('DATABASE')
    ) {
        return <Database className="h-4 w-4" />;
    }

    if (
        normalized.includes('REDIS') ||
        normalized.includes('API_') ||
        normalized.includes('SYSTEM') ||
        normalized.includes('SERVICE') ||
        normalized.includes('QUEUE') ||
        normalized.includes('OUTBOX')
    ) {
        return <Server className="h-4 w-4" />;
    }

    if (
        normalized.includes('ORGANIZATION')
    ) {
        return <Building2 className="h-4 w-4" />;
    }

    if (
        normalized.includes('STAFF') ||
        normalized.includes('ADMIN')
    ) {
        return <Users className="h-4 w-4" />;
    }

    if (
        normalized.includes('REGISTRATION') ||
        normalized.includes('WAITLIST') ||
        normalized.includes('PAYMENT')
    ) {
        return <UserPlus className="h-4 w-4" />;
    }

    if (
        normalized.includes('TICKET') ||
        normalized.includes('CHECKIN') ||
        normalized.includes('CHECKED_IN')
    ) {
        return <Ticket className="h-4 w-4" />;
    }

    if (
        normalized.includes('EVENT') ||
        normalized === 'EVENT'
    ) {
        return <Calendar className="h-4 w-4" />;
    }

    if (
        normalized === 'SUCCESS' ||
        normalized.includes('RECOVERED')
    ) {
        return <CheckCircle2 className="h-4 w-4" />;
    }

    if (
        normalized === 'WARNING' ||
        normalized.includes('FAILED') ||
        normalized.includes('FAILURE')
    ) {
        return <AlertTriangle className="h-4 w-4" />;
    }

    return <Info className="h-4 w-4" />;
}

function getNotificationIconStyle(type: string) {
    const normalized = normalizeType(type);

    if (
        normalized.includes('SECURITY') ||
        normalized.includes('LOGIN') ||
        normalized.includes('UNAUTHORIZED') ||
        normalized.includes('SESSION') ||
        normalized.includes('PASSWORD')
    ) {
        return 'bg-red-50 text-red-600';
    }

    if (
        normalized.includes('DATABASE') ||
        normalized.includes('REDIS') ||
        normalized.includes('API_') ||
        normalized.includes('SYSTEM') ||
        normalized.includes('QUEUE') ||
        normalized.includes('OUTBOX') ||
        normalized.includes('FAILURE')
    ) {
        return 'bg-orange-50 text-orange-600';
    }

    if (
        normalized.includes('REGISTRATION') ||
        normalized.includes('WAITLIST') ||
        normalized.includes('PAYMENT')
    ) {
        return 'bg-violet-50 text-violet-600';
    }

    if (
        normalized.includes('TICKET') ||
        normalized.includes('CHECKIN') ||
        normalized.includes('CHECKED_IN')
    ) {
        return 'bg-sky-50 text-sky-600';
    }

    if (
        normalized.includes('ORGANIZATION') ||
        normalized.includes('STAFF') ||
        normalized.includes('ADMIN')
    ) {
        return 'bg-emerald-50 text-emerald-600';
    }

    if (
        normalized.includes('EVENT')
    ) {
        return 'bg-blue-50 text-blue-600';
    }

    if (
        normalized === 'SUCCESS' ||
        normalized.includes('RECOVERED')
    ) {
        return 'bg-brand-50 text-brand-600';
    }

    return 'bg-ink-50 text-ink-500';
}

function getCategoryLabel(category: NotificationCategory) {
    switch (category) {
        case 'unread':
            return 'Unread';

        case 'system':
            return 'System';

        case 'security':
            return 'Security';

        case 'events':
            return 'Events';

        case 'registrations':
            return 'Registrations';

        default:
            return 'All';
    }
}

export function Notifications() {
    const { user } = useAuth();
    const qc = useQueryClient();

    const [category, setCategory] =
        useState<NotificationCategory>('all');

    const [search, setSearch] = useState('');

    const {
        data,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['notifications', user?.id],
        queryFn: () =>
            NotificationsAPI.list({
                page: 1,
                limit: 100,
            }),
        enabled: !!user,
    });

    const notifications = normalizeNotifications(data);

    const markRead = useMutation({
        mutationFn: (id: number) =>
            NotificationsAPI.markRead(id),

        onSuccess: () => {
            qc.invalidateQueries({
                queryKey: ['notifications'],
            });

            qc.invalidateQueries({
                queryKey: ['notifications', 'unread-count'],
            });
        },
    });

    const markAll = useMutation({
        mutationFn: () =>
            NotificationsAPI.markAllRead(),

        onSuccess: () => {
            qc.invalidateQueries({
                queryKey: ['notifications'],
            });

            qc.invalidateQueries({
                queryKey: ['notifications', 'unread-count'],
            });
        },
    });

    const unread = notifications.filter(
        (notification) =>
            isNotificationUnread(notification)
    ).length;

    const systemCount = notifications.filter(
        (notification) =>
            getCategory(notification.type) === 'system'
    ).length;

    const securityCount = notifications.filter(
        (notification) =>
            getCategory(notification.type) === 'security'
    ).length;

    const eventCount = notifications.filter(
        (notification) =>
            getCategory(notification.type) === 'events'
    ).length;

    const registrationCount = notifications.filter(
        (notification) =>
            getCategory(notification.type) === 'registrations'
    ).length;

    const filteredNotifications = useMemo(() => {
        const query = search.trim().toLowerCase();

        return notifications.filter((notification) => {
            const notificationCategory =
                getCategory(notification.type);

            const matchesCategory =
                category === 'all'
                    ? true
                    : category === 'unread'
                        ? isNotificationUnread(notification)
                        : notificationCategory === category;

            if (!matchesCategory) {
                return false;
            }

            if (!query) {
                return true;
            }

            const title =
                getNotificationTitle(notification);

            return (
                title.toLowerCase().includes(query) ||
                notification.message
                    .toLowerCase()
                    .includes(query) ||
                notification.type
                    .toLowerCase()
                    .includes(query)
            );
        });
    }, [notifications, category, search]);

    const tabs: {
        id: NotificationCategory;
        label: string;
        count?: number;
    }[] = [
            {
                id: 'all',
                label: 'All',
                count: notifications.length,
            },
            {
                id: 'unread',
                label: 'Unread',
                count: unread,
            },
            {
                id: 'system',
                label: 'System',
                count: systemCount,
            },
            {
                id: 'security',
                label: 'Security',
                count: securityCount,
            },
            {
                id: 'events',
                label: 'Events',
                count: eventCount,
            },
            {
                id: 'registrations',
                label: 'Registrations',
                count: registrationCount,
            },
        ];

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
            {/* Header */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
                            Platform
                        </p>

                        {unread > 0 && (
                            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                                {unread} unread
                            </span>
                        )}
                    </div>

                    <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink-950">
                        Notifications
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm text-ink-500">
                        System activity, security alerts, events,
                        registrations and important platform updates.
                    </p>
                </div>

                {unread > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAll.mutate()}
                        loading={markAll.isPending}
                    >
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark all as read
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="mt-7">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />

                    <input
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                        placeholder="Search notifications..."
                        className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-4 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="mt-4 overflow-x-auto">
                <div className="flex min-w-max gap-2">
                    {tabs.map((tab) => {
                        const active = category === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() =>
                                    setCategory(tab.id)
                                }
                                className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${active
                                        ? 'bg-ink-900 text-white'
                                        : 'bg-white text-ink-600 hover:bg-ink-50'
                                    }`}
                            >
                                {tab.label}

                                {typeof tab.count === 'number' && (
                                    <span
                                        className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${active
                                                ? 'bg-white/15 text-white'
                                                : 'bg-ink-100 text-ink-500'
                                            }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Notification list */}
            <div className="mt-5 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
                {isLoading ? (
                    <div className="space-y-3 p-6">
                        {Array.from({ length: 6 }).map(
                            (_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-20 rounded-xl"
                                />
                            )
                        )}
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                            <XCircle className="h-6 w-6" />
                        </div>

                        <h3 className="mt-4 text-sm font-semibold text-ink-900">
                            Unable to load notifications
                        </h3>

                        <p className="mt-1 max-w-sm text-sm text-ink-500">
                            Something went wrong while loading
                            your platform notifications.
                        </p>

                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() =>
                                qc.invalidateQueries({
                                    queryKey: ['notifications'],
                                })
                            }
                        >
                            Try again
                        </Button>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <EmptyState
                        icon={
                            category === 'security' ? (
                                <ShieldAlert className="h-6 w-6" />
                            ) : category === 'system' ? (
                                <Server className="h-6 w-6" />
                            ) : category === 'events' ? (
                                <Calendar className="h-6 w-6" />
                            ) : category === 'registrations' ? (
                                <Users className="h-6 w-6" />
                            ) : (
                                <Bell className="h-6 w-6" />
                            )
                        }
                        title={
                            search
                                ? 'No matching notifications'
                                : category === 'unread'
                                    ? 'You are all caught up'
                                    : `No ${getCategoryLabel(category).toLowerCase()} notifications`
                        }
                        description={
                            search
                                ? 'Try a different search term or change the notification filter.'
                                : 'Important platform activity and system updates will appear here.'
                        }
                    />
                ) : (
                    <div className="divide-y divide-ink-100">
                        {filteredNotifications.map(
                            (notification) => {
                                const unreadNotification =
                                    isNotificationUnread(
                                        notification
                                    );

                                const title =
                                    getNotificationTitle(
                                        notification
                                    );

                                const iconStyle =
                                    getNotificationIconStyle(
                                        notification.type
                                    );

                                const inner = (
                                    <div
                                        className={`group relative flex gap-4 px-4 py-4 transition-colors sm:px-5 ${unreadNotification
                                                ? 'bg-brand-50/30 hover:bg-brand-50/60'
                                                : 'hover:bg-ink-50/60'
                                            }`}
                                    >
                                        {/* Unread indicator */}
                                        {unreadNotification && (
                                            <span className="absolute left-0 top-0 h-full w-0.5 bg-brand-500" />
                                        )}

                                        {/* Icon */}
                                        <div
                                            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}
                                        >
                                            {getNotificationIcon(
                                                notification.type
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p
                                                            className={`text-sm ${unreadNotification
                                                                    ? 'font-bold text-ink-950'
                                                                    : 'font-semibold text-ink-800'
                                                                }`}
                                                        >
                                                            {title}
                                                        </p>

                                                        {unreadNotification && (
                                                            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                                                        )}
                                                    </div>
                                                </div>

                                                <span className="flex shrink-0 items-center gap-1 text-[11px] text-ink-400">
                                                    <Clock3 className="h-3 w-3" />
                                                    {fmtRelative(
                                                        notification.created_at
                                                    )}
                                                </span>
                                            </div>

                                            <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-600">
                                                {notification.message}
                                            </p>

                                            <div className="mt-2 flex items-center gap-3">
                                                <span className="rounded-md bg-ink-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                                                    {getCategoryLabel(
                                                        getCategory(
                                                            notification.type
                                                        )
                                                    )}
                                                </span>

                                                {unreadNotification && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();

                                                            markRead.mutate(
                                                                notification.id
                                                            );
                                                        }}
                                                        className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                                                    >
                                                        Mark as read
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );

                                return notification.link ? (
                                    <Link
                                        key={notification.id}
                                        to={notification.link}
                                        onClick={() => {
                                            if (unreadNotification) {
                                                markRead.mutate(
                                                    notification.id
                                                );
                                            }
                                        }}
                                        className="block"
                                    >
                                        {inner}
                                    </Link>
                                ) : (
                                    <div key={notification.id}>
                                        {inner}
                                    </div>
                                );
                            }
                        )}
                    </div>
                )}
            </div>

            {/* Footer summary */}
            {!isLoading &&
                notifications.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            Showing {filteredNotifications.length}{' '}
                            of {notifications.length}{' '}
                            notifications
                        </span>

                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <Activity className="h-3.5 w-3.5" />
                                Platform activity
                            </span>

                            <span>•</span>

                            <span>{unread} unread</span>
                        </div>
                    </div>
                )}
        </div>
    );
}