import React from 'react';
import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-[12px]',
  md: 'w-10 h-10 text-[14px]',
  lg: 'w-12 h-12 text-[16px]',
};

// Generates a consistent background color based on the name string
function getAvatarColor(name: string) {
  const colors = [
    'bg-link-soft text-link-deep',
    'bg-violet-soft text-violet',
    'bg-cyan-soft text-[#1a7a6b]',
    'bg-warning-soft text-warning-deep',
    'bg-[#ffd6e8] text-magenta',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name || '?');
  const colorClass = getAvatarColor(name || 'Unknown');

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-medium shrink-0 select-none border border-hairline',
        sizeClasses[size],
        colorClass,
        className
      )}
      title={name}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
