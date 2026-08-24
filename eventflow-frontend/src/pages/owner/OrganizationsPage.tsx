import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Input } from '@/components/ui/Input';
import { organizationsApi } from '@/api/organizations';
import { useDebounce } from '@/hooks/useDebounce';

export function OrganizationsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const debounced = useDebounce(search, 300);
    const { data, isLoading } = useQuery({
        queryKey: ['organizations', { page, search: debounced }],
        queryFn: () => organizationsApi.list({ page, search: debounced }),
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Organizations</h1>
                    <p className="mt-1 text-sm text-ink-500">All organizations you own or administer.</p>
                </div>
                <Link to="/owner/organizations/new"><Button>+ New organization</Button></Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All organizations</CardTitle>
                    <Input
                        placeholder="Search…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="max-w-xs"
                    />
                </CardHeader>

                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                    </div>
                ) : (data?.data?.length ?? 0) === 0 ? (
                    <EmptyState
                        icon={<Building2 className="h-5 w-5" />}
                        title="No organizations yet"
                        description="Create your first organization to start running events."
                        action={<Link to="/owner/organizations/new"><Button>Create organization</Button></Link>}
                    />
                ) : (
                    <div className="divide-y divide-ink-100">
                        {data!.data.map(org => (
                            <Link
                                key={org.id}
                                to={`/owner/organizations/${org.id}`}
                                className="flex items-center justify-between px-1 py-3 hover:bg-ink-50/60"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-ink-900">{org.name}</p>
                                    <p className="text-xs text-ink-500">{org.description ?? '—'}</p>
                                </div>
                                <span className="text-xs text-ink-400">/{org.slug}</span>
                            </Link>
                        ))}
                    </div>
                )}

                <div className="mt-4">
                    <Pagination
                        page={data?.meta.page ?? 1}
                        totalPages={data?.meta.total_pages ?? 1}
                        onChange={setPage}
                    />
                </div>
            </Card>
        </div>
    );
}
