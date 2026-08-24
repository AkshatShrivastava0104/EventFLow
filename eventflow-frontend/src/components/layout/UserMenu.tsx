import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, Shield } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { isPlatformAdmin } from '@/lib/roles';
import { cn } from '@/lib/utils';

interface Props {
  /** "light" renders for dark backgrounds (owner console). */
  tone?: 'light' | 'dark';
}

export function UserMenu({ tone = 'dark' }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const onLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const light = tone === 'light';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm transition',
          light
            ? 'text-white/90 hover:bg-white/10'
            : 'text-ink-700 hover:bg-ink-100',
        )}
      >
        <Avatar name={user.name} size={28} />
        <span className="hidden max-w-[8rem] truncate font-medium sm:block">
          {user.name || user.email}
        </span>
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-ink-200 bg-white p-1 shadow-pop">
            <div className="flex items-center gap-3 border-b border-ink-100 p-3">
              <Avatar name={user.name} size={38} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {user.name || 'Account'}
                </p>
                <p className="truncate text-xs text-ink-500">{user.email}</p>
              </div>
            </div>
            {isPlatformAdmin(user) && (
              <div className="px-3 py-2">
                <Badge tone="accent">
                  <Shield className="mr-1 h-3 w-3" /> Platform admin
                </Badge>
              </div>
            )}
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger-600 hover:bg-danger-50"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
