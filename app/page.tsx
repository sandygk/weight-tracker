'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import BottomNav, { Tab } from '@/components/BottomNav';
import OverviewTab from '@/components/OverviewTab';
import WeightHistory from '@/components/WeightHistory';
import SettingsTab from '@/components/SettingsTab';
import LogModal from '@/components/LogModal';
import { getEntries, getGoal } from '@/lib/storage';
import { getUnit, Unit } from '@/lib/units';
import { getTheme, applyTheme } from '@/lib/theme';
import { WeightEntry, Goal } from '@/types';

const TAB_TITLES: Record<Tab, string> = {
  chart: 'Overview',
  history: 'History',
  settings: 'Settings',
};

function getTabFromHash(): Tab {
  if (typeof window === 'undefined') return 'chart';
  const hash = window.location.hash.slice(1);
  const valid: Tab[] = ['chart', 'history', 'settings'];
  return valid.includes(hash as Tab) ? (hash as Tab) : 'chart';
}

export default function Home() {
  const [tab, setTab] = useState<Tab>(() => getTabFromHash());
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [unit, setUnit] = useState<Unit>(() => getUnit());
  const [showLog, setShowLog] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const reload = useCallback(() => {
    setEntries(getEntries());
    setGoal(getGoal());
  }, []);

  const handleTabChange = useCallback((t: Tab) => {
    setTab(t);
    window.location.hash = t;
  }, []);

  useEffect(() => {
    const onHashChange = () => setTab(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (getTheme() === 'system') applyTheme('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
    // Pick up the event if it fired before React mounted
    if ((window as any).__pwaPrompt) setInstallPrompt((window as any).__pwaPrompt);
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {tab !== 'chart' && (
        <header className="px-5 pt-5 pb-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {TAB_TITLES[tab]}
            {tab === 'history' && (
              <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">{entries.length} entries</span>
            )}
          </h1>
        </header>
      )}

      <div className="max-w-lg mx-auto">
        {tab === 'chart' && <OverviewTab entries={entries} goal={goal} unit={unit} onChange={reload} />}

        {tab === 'history' && (
          <div className="px-4 py-4 space-y-4">
            <WeightHistory entries={entries} unit={unit} goal={goal} onChange={reload} />
          </div>
        )}

        {tab === 'settings' && (
          <SettingsTab
            onUnitChange={setUnit}
            installPrompt={installPrompt}
            onInstalled={() => setInstallPrompt(null)}
            onImport={reload}
            goal={goal}
            entries={entries}
          />
        )}
      </div>

      {/* FAB */}
      {tab === 'chart' && <button
        type="button"
        onClick={() => setShowLog(true)}
        style={{ touchAction: 'manipulation', bottom: '80px' }}
        className="fixed left-1/2 -translate-x-1/2 z-40 w-14 h-14 bg-blue-500 rounded-full shadow-lg flex items-center justify-center active:bg-blue-700 transition-colors"
      >
        <Plus size={24} color="white" strokeWidth={2.5} />
      </button>}

      {showLog && (
        <LogModal entries={entries} unit={unit} onSave={reload} onClose={() => setShowLog(false)} />
      )}

      <BottomNav active={tab} onChange={handleTabChange} />
    </main>
  );
}
