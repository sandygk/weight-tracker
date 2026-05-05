'use client';

import { LineChart, List, Settings } from 'lucide-react';
import { User } from '@/lib/firebaseAuth';

export type Tab = 'chart' | 'history' | 'settings';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  user: User | null;
}

function UserAvatar({ user, active }: { user: User; active: boolean }) {
  const color = active ? 'ring-blue-500' : 'ring-gray-300 dark:ring-gray-600';

  if (user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt="avatar"
        className={`w-6 h-6 rounded-full ring-2 ${color}`}
      />
    );
  }

  const initials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user.email ?? '?')[0].toUpperCase();

  return (
    <div className={`w-6 h-6 rounded-full ring-2 ${color} flex items-center justify-center text-[10px] font-bold ${active ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
      {initials}
    </div>
  );
}

export default function BottomNav({ active, onChange, user }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex">
      {(['chart', 'history', 'settings'] as Tab[]).map(id => {
        const isActive = active === id;
        const label = id === 'chart' ? 'Overview' : id === 'history' ? 'History' : 'Settings';

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            style={{ touchAction: 'manipulation' }}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              isActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {id === 'settings' && user ? (
              <UserAvatar user={user} active={isActive} />
            ) : id === 'chart' ? (
              <LineChart size={20} strokeWidth={isActive ? 2.5 : 1.5} />
            ) : (
              <List size={20} strokeWidth={isActive ? 2.5 : 1.5} />
            )}
            {label}
          </button>
        );
      })}
    </nav>
  );
}
