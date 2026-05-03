'use client';

import { LineChart, List, Settings } from 'lucide-react';

export type Tab = 'chart' | 'history' | 'settings';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'chart',    label: 'Overview', Icon: LineChart },
  { id: 'history',  label: 'History',  Icon: List },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          style={{ touchAction: 'manipulation' }}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
            active === id ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <Icon size={20} strokeWidth={active === id ? 2.5 : 1.5} />
          {label}
        </button>
      ))}
    </nav>
  );
}
