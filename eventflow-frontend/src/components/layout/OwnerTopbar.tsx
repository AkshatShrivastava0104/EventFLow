import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from './NotificationBell';
import { Avatar } from '@/components/ui/Avatar';

export function OwnerTopbar({ onMobileMenu }: { onMobileMenu: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-ink-200 bg-white/80 px-4 backdrop-blur lg:px-6">
      <button
        onClick={onMobileMenu}
        className="grid h-9 w-9 place-items-center rounded text-ink-600 hover:bg-ink-100 lg:hidden"
        aria-label="Open menu"
      >
        <span className="block h-0.5 w-4 bg-current" />
      </button>

      <div className="hidden flex-1 md:block">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            placeholder="Search…"
            className="h-9 w-full rounded-md border border-ink-200 bg-white pl-9 pr-3 text-sm placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/10"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <div className="relative">
          <button
            onClick={() => setMenu(m => !m)}
            className="flex items-center gap-2 rounded p-1 hover:bg-ink-100"
          >
            <Avatar name={user?.name} size={28} />
            <span className="hidden text-sm font-medium text-ink-800 md:block">{user?.name}</span>
            <ChevronDown className="hidden h-4 w-4 text-ink-500 md:block" />
          </button>
          {menu && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-ink-200 bg-white py-1 shadow-pop">
              <div className="border-b border-ink-100 px-3 py-2">
                <p className="text-sm font-medium text-ink-900">{user?.name}</p>
                <p className="truncate text-xs text-ink-500">{user?.email}</p>
              </div>
              <Link
                to="/owner/settings"
                onClick={() => setMenu(false)}
                className="block px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
              >Settings</Link>
              <button
                onClick={async () => { await logout(); navigate('/login'); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
