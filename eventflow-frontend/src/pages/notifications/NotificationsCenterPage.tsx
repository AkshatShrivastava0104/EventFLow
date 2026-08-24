import { useState } from 'react';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { Bell } from 'lucide-react';

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { NotificationItem } from '@/components/notifications/NotificationItem';

import { notificationsApi } from '@/api/notifications';
import { useToast } from '@/contexts/ToastContext';
import { normalizeError } from '@/api/client';

export function NotificationsCenterPage() {
    const [page, setPage] = useState(1);

    const qc = useQueryClient();
    const toast = useToast();

    const list = useQuery({
        queryKey: ['notifications', { page }],
        queryFn: () =>
            notificationsApi.list({
                page,
                page_size: 20,
            }),
    });

    const markRead = useMutation({
        mutationFn: (id: string) =>
            notificationsApi.markRead(id),

        onSuccess: () => {
            qc.invalidateQueries({
                queryKey: ['notifications'],
            });

            qc.invalidateQueries({
                queryKey: ['notifications', 'unread-count'],
            });
        },

        onError: (error) => {
            toast.error(
                normalizeError(error).message,
            );
        },
    });

    const markAll = useMutation({
        mutationFn: () =>
            notificationsApi.markAllRead(),

        onSuccess: () => {
            qc.invalidateQueries({
                queryKey: ['notifications'],
            });

            qc.invalidateQueries({
                queryKey: ['notifications', 'unread-count'],
            });

            toast.success(
                'All notifications marked as read.',
            );
        },

        onError: (error) => {
            toast.error(
                normalizeError(error).message,
            );
        },
    });

    const notifications =
        list.data?.data ?? [];

    const currentPage =
        list.data?.meta?.page ?? page;

    const totalPages =
        list.data?.meta?.total_pages ?? 1;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
                        Notifications
                    </h1>

                    <p className="mt-1 text-sm text-ink-500">
                        Updates about your events, registrations and
                        tickets.
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={() => markAll.mutate()}
                    loading={markAll.isPending}
                    disabled={
                        markAll.isPending ||
                        notifications.length === 0
                    }
                >
                    Mark all as read
                </Button>
            </div>

            <Card padded={false}>
                <CardHeader className="px-5 pt-5">
                    <div>
                        <CardTitle>
                            Recent
                        </CardTitle>

                        <CardDescription>
                            Click an unread notification to mark it read.
                        </CardDescription>
                    </div>
                </CardHeader>

                {list.isLoading ? (
                    <div className="space-y-2 px-5 pb-5">
                        {Array.from({
                            length: 5,
                        }).map((_, index) => (
                            <Skeleton
                                key={index}
                                className="h-12"
                            />
                        ))}
                    </div>
                ) : list.isError ? (
                    <div className="px-5 pb-5">
                        <EmptyState
                            icon={
                                <Bell className="h-5 w-5" />
                            }
                            title="Unable to load notifications"
                            description="Please try again in a moment."
                        />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="px-5 pb-5">
                        <EmptyState
                            icon={
                                <Bell className="h-5 w-5" />
                            }
                            title="No notifications yet"
                            description="You’ll be notified about registrations, waitlist updates and tickets."
                        />
                    </div>
                ) : (
                    <div>
                        {notifications.map(
                            (notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onMarkRead={(id) =>
                                        markRead.mutate(id)
                                    }
                                />
                            ),
                        )}
                    </div>
                )}

                <div className="px-5 py-4">
                    <Pagination
                        page={currentPage}
                        totalPages={totalPages}
                        onChange={setPage}
                    />
                </div>
            </Card>
        </div>
    );
}