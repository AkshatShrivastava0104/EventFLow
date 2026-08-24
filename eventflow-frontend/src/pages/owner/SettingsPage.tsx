import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

export function SettingsPage() {
    const { user } = useAuth();
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Settings</h1>
                <p className="mt-1 text-sm text-ink-500">Manage your account and preferences.</p>
            </div>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>Your personal information.</CardDescription>
                    </div>
                </CardHeader>
                <div className="flex items-center gap-4">
                    <Avatar name={user?.name} size={56} />
                    <div>
                        <p className="text-sm font-semibold text-ink-900">{user?.name}</p>
                        <p className="text-xs text-ink-500">{user?.email}</p>
                        <p className="mt-1 text-2xs uppercase tracking-wide text-ink-500">Role · {user?.role}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Update details</CardTitle>
                        <CardDescription>Edits will be sent to your backend.</CardDescription>
                    </div>
                </CardHeader>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Input label="Full name" defaultValue={user?.name} />
                    <Input label="Email" type="email" defaultValue={user?.email} />
                    <Input label="New password" type="password" />
                    <Input label="Confirm new password" type="password" />
                </div>
                <div className="mt-4 flex justify-end">
                    <Button>Save changes</Button>
                </div>
            </Card>
        </div>
    );
}
