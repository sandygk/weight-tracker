'use client';

import { useEffect, useState, useCallback } from 'react';
import { getRedirectResult } from 'firebase/auth';
import { Plus } from 'lucide-react';
import BottomNav, { Tab } from '@/components/BottomNav';
import OverviewTab from '@/components/OverviewTab';
import WeightHistory from '@/components/WeightHistory';
import SettingsTab from '@/components/SettingsTab';
import LogModal from '@/components/LogModal';
import { subscribeEntries, subscribeGoal, getEntriesOnce } from '@/lib/db';
import { onAuthChange, signOut, User } from '@/lib/firebaseAuth';
import { auth } from '@/lib/firebase';
import { getEntries, getGoal, getLocalData, replaceAll } from '@/lib/storage';
import { importEntries, saveGoal } from '@/lib/data';
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
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle');

  const [tab, setTab] = useState<Tab>('chart'); // start as 'chart' to match SSR, update from hash after mount
  const [entries, setEntries] = useState<WeightEntry[]>(() => getEntries());
  const [goal, setGoal] = useState<Goal | null>(() => getGoal());
  const [unit, setUnit] = useState<Unit>(() => getUnit());
  const [showLog, setShowLog] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const reload = useCallback(() => {
    setEntries(getEntries());
    setGoal(getGoal());
  }, []);

  // Auth listener
  useEffect(() => {
    return onAuthChange(async u => {
      if (u) {
        const local = getLocalData();
        if (local.entries.length > 0) {
          const existing = await getEntriesOnce(u.uid);
          if (existing.length === 0) {
            setSyncStatus('syncing');
            await importEntries(u.uid, local.entries);
            if (local.goal) await saveGoal(u.uid, local.goal);
            setSyncStatus('done');
            setTimeout(() => setSyncStatus('idle'), 3000);
          }
        }
      }
      setUser(u);
    });
  }, []);

  // Firestore subscriptions — active only while signed in
  useEffect(() => {
    if (!user) {
      reload();
      return;
    }
    const unsubEntries = subscribeEntries(user.uid, setEntries);
    const unsubGoal = subscribeGoal(user.uid, setGoal);
    return () => { unsubEntries(); unsubGoal(); };
  }, [user, reload]);

  // Sign out: snapshot current Firestore state to localStorage, then sign out
  async function handleSignOut() {
    replaceAll(entries, goal);
    await signOut();
  }

  const handleTabChange = useCallback((t: Tab) => {
    setTab(t);
    window.location.hash = t;
  }, []);

  useEffect(() => {
    setTab(getTabFromHash());
    const onHashChange = () => setTab(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    if (auth) getRedirectResult(auth).catch(() => {});
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (getTheme() === 'system') applyTheme('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
    if ((window as any).__pwaPrompt) setInstallPrompt((window as any).__pwaPrompt);
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const uid = user?.uid ?? null;

  return (
    <main className="bg-gray-50 dark:bg-gray-950 pb-20">
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
        {tab === 'chart' && <OverviewTab entries={entries} goal={goal} unit={unit} />}

        {tab === 'history' && (
          <div className="px-4 py-4 space-y-4">
            <WeightHistory uid={uid} entries={entries} unit={unit} goal={goal} onChange={reload} />
          </div>
        )}

        {tab === 'settings' && (
          <SettingsTab
            uid={uid}
            user={user}
            syncStatus={syncStatus}
            onSignOut={handleSignOut}
            onUnitChange={setUnit}
            installPrompt={installPrompt}
            onInstalled={() => setInstallPrompt(null)}
            onImport={reload}
            goal={goal}
            entries={entries}
          />
        )}
      </div>

      {tab === 'chart' && (
        <button
          type="button"
          onClick={() => setShowLog(true)}
          style={{ touchAction: 'manipulation', bottom: '80px' }}
          className="fixed left-1/2 -translate-x-1/2 z-40 w-14 h-14 bg-blue-500 rounded-full shadow-lg flex items-center justify-center active:bg-blue-700 transition-colors"
        >
          <Plus size={24} color="white" strokeWidth={2.5} />
        </button>
      )}

      {showLog && (
        <LogModal uid={uid} entries={entries} unit={unit} onSave={reload} onClose={() => setShowLog(false)} />
      )}

      <BottomNav active={tab} onChange={handleTabChange} />
    </main>
  );
}
