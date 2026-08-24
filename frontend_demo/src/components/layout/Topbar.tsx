import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { Bell, LogOut, User as UserIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications';
import { Link } from 'react-router-dom';

export function Topbar() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'topbar'],
    queryFn: () => notificationsApi.list(1, 10),
    refetchInterval: 30000,
  });

  const unreadCount = notificationsData?.notifications.filter(n => n.status === 'unread').length || 0;

  return (
    <header className="h-16 border-b border-hairline bg-canvas flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex-1"></div>
      
      <div className="flex items-center gap-4 relative">
        <Link 
          to="/notifications" 
          className="relative p-2 text-mute hover:text-ink transition-colors rounded-full hover:bg-hairline-soft"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-link"></span>
          )}
        </Link>
        
        <div className="relative">
          <button 
            className="flex items-center gap-2 focus:outline-none"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <Avatar name={user?.name || ''} size="sm" />
          </button>

          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowDropdown(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-48 bg-elevated border border-hairline rounded-[var(--radius-md)] shadow-floating z-50 py-1">
                <div className="px-4 py-2 border-b border-hairline-soft">
                  <p className="text-[14px] font-medium text-ink truncate">{user?.name}</p>
                  <p className="text-[12px] text-mute truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-[14px] text-body hover:bg-hairline-soft hover:text-ink flex items-center gap-2 transition-colors"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
