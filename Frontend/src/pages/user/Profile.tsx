import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Input, TextArea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import {
  User as UserIcon,
  Mail,
  Phone,
  Bell,
  Shield,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function Profile() {
  const {
    user,
    displayName,
    signOut,
    role,
  } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState<
    'profile' | 'notifications' | 'security' | 'roles'
  >('profile');

  useEffect(() => {
    if (!user) {
      setName('');
      setPhone('');
      setBio('');
      return;
    }

    setName(user.name || displayName);
  }, [user, displayName]);

  const save = async () => {
    setSaving(true);

    try {
      // Profile update endpoint is not part of the current backend contract yet.
      toast('Profile update API is not connected yet.', {
        icon: 'ℹ️',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = () => {
    // Notification preference persistence needs a backend endpoint.
    toast('Notification preferences API is not connected yet.', {
      icon: 'ℹ️',
    });
  };

  const updatePassword = () => {
    // Password update needs a dedicated backend endpoint.
    toast('Password update API is not connected yet.', {
      icon: 'ℹ️',
    });
  };

  const roleLabel = {
    owner: 'Owner',
    admin: 'Admin',
    staff: 'Staff',
    user: 'User',
  }[role];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
        Account
      </p>

      <h1 className="font-display text-4xl font-semibold">
        Profile & settings
      </h1>

      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1 rounded-2xl border border-ink-200 bg-white p-3">
          {[
            {
              id: 'profile',
              label: 'Profile',
              icon: <UserIcon className="h-4 w-4" />,
            },
            {
              id: 'notifications',
              label: 'Notifications',
              icon: <Bell className="h-4 w-4" />,
            },
            {
              id: 'security',
              label: 'Security',
              icon: <Shield className="h-4 w-4" />,
            },
            {
              id: 'roles',
              label: 'Roles & access',
              icon: <LayoutDashboard className="h-4 w-4" />,
            },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === t.id
                ? 'bg-ink-900 text-white'
                : 'text-ink-700 hover:bg-ink-100'
                }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}

          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center gap-2 rounded-lg border-t border-ink-100 px-3 py-2 pt-3 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </aside>

        <div className="space-y-4">
          {tab === 'profile' && (
            <div className="rounded-2xl border border-ink-200 bg-white p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-sky-500 text-2xl font-bold text-white">
                  {(name || displayName || 'G').slice(0, 1).toUpperCase()}
                </div>

                <div>
                  <p className="font-display text-xl font-semibold">
                    {name || 'Your name'}
                  </p>

                  <p className="text-sm text-ink-500">
                    {user?.email || 'No email'}
                  </p>

                  <Badge className="mt-1" tone="green">
                    {roleLabel} account
                  </Badge>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full name"
                  icon={<UserIcon className="h-4 w-4" />}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <Input
                  label="Email"
                  icon={<Mail className="h-4 w-4" />}
                  value={user?.email || ''}
                  disabled
                />

                <Input
                  label="Phone"
                  icon={<Phone className="h-4 w-4" />}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <div className="sm:col-span-2">
                  <TextArea
                    label="Short bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell organizers a bit about yourself…"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  variant="secondary"
                  onClick={save}
                  loading={saving}
                >
                  Save changes
                </Button>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="rounded-2xl border border-ink-200 bg-white p-6">
              <h2 className="font-display text-lg font-semibold">
                Email notifications
              </h2>

              <div className="mt-4 space-y-3">
                {[
                  'Ticket confirmations & receipts',
                  'Reminders 24 hours before an event',
                  'Waitlist promotions',
                  'New events from organizers you follow',
                  'Product updates & tips',
                ].map((label) => (
                  <label
                    key={label}
                    className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3 text-sm"
                  >
                    {label}

                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 accent-brand-500"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  variant="secondary"
                  onClick={saveNotifications}
                >
                  Save preferences
                </Button>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="rounded-2xl border border-ink-200 bg-white p-6">
              <h2 className="font-display text-lg font-semibold">
                Security
              </h2>

              <div className="mt-4 space-y-4">
                <Input
                  label="Current password"
                  type="password"
                  placeholder="••••••"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="New password"
                    type="password"
                  />

                  <Input
                    label="Confirm new password"
                    type="password"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Two-factor authentication
                    </p>

                    <p className="text-xs text-ink-500">
                      Add an extra layer of protection to your account.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast('2FA backend support is not connected yet.', {
                        icon: 'ℹ️',
                      })
                    }
                  >
                    Enable
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  variant="secondary"
                  onClick={updatePassword}
                >
                  Update password
                </Button>
              </div>
            </div>
          )}

          {tab === 'roles' && (
            <div className="rounded-2xl border border-ink-200 bg-white p-6">
              <h2 className="font-display text-lg font-semibold">
                Roles & access
              </h2>

              <p className="mt-1 text-sm text-ink-500">
                Your access level is assigned by EventFlow and cannot be
                changed from the frontend.
              </p>

              <div className="mt-5 rounded-2xl border border-ink-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  Current role
                </p>

                <div className="mt-2 flex items-center gap-3">
                  <Badge tone="green">
                    {roleLabel}
                  </Badge>

                  <span className="text-sm text-ink-600">
                    {user?.organization_id
                      ? `Organization #${user.organization_id}`
                      : 'Personal account'}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {role === 'owner' && (
                  <Link to="/dashboard">
                    <Button
                      variant="outline"
                      leftIcon={
                        <LayoutDashboard className="h-4 w-4" />
                      }
                    >
                      Owner dashboard
                    </Button>
                  </Link>
                )}

                {role === 'user' && (
                  <p className="text-sm text-ink-500">
                    You currently have attendee access.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}