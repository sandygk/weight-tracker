'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import BottomNav, { Tab } from '@/components/BottomNav';
import OverviewTab from '@/components/OverviewTab';
import WeightHistory from '@/components/WeightHistory';
import SettingsTab from '@/components/SettingsTab';
import LogModal from '@/components/LogModal';
import { subscribeEntries, subscribeGoal, migrateToDateIds } from '@/lib/db';
import { onAuthChange, signOut, User } from '@/lib/firebaseAuth';
import { getEntries, getGoal } from '@/lib/storage';
import { getUnit, Unit } from '@/lib/units';
import { dlog } from '@/lib/debugLog';
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
  const [authResolved, setAuthResolved] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const [tab, setTab] = useState<Tab>('chart');
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [unit, setUnit] = useState<Unit>('lb');
  const [showLog, setShowLog] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const reload = useCallback(() => {
    setEntries(getEntries());
    setGoal(getGoal());
  }, []);

  useEffect(() => {
    return onAuthChange(async u => {
      dlog(`onAuthChange uid=${u?.uid ?? 'null'} email=${u?.email ?? 'none'}`);
      try {
        if (u) await migrateToDateIds(u.uid);
        setUser(u);
        setAuthResolved(true);
      } catch (e) {
        dlog(`onAuthChange ERROR: ${e}`);
        setUser(u);
        setAuthResolved(true);
      }
    });
  }, []);

  // Signed in → Firestore subscriptions drive state.
  // Not signed in → read localStorage once.
  useEffect(() => {
    if (!authResolved) return;
    if (!user) {
      reload();
      setDataReady(true);
      return;
    }
    setDataReady(false);
    let entriesLoaded = false, goalLoaded = false;
    const checkReady = () => { if (entriesLoaded && goalLoaded) setDataReady(true); };
    const unsubEntries = subscribeEntries(user.uid, data => { setEntries(data); entriesLoaded = true; checkReady(); });
    const unsubGoal = subscribeGoal(user.uid, data => { setGoal(data); goalLoaded = true; checkReady(); });
    return () => { unsubEntries(); unsubGoal(); };
  }, [user, authResolved, reload]);

  async function handleSignOut() {
    await signOut();
  }

  const handleTabChange = useCallback((t: Tab) => {
    setTab(t);
    window.location.hash = t;
  }, []);

  useEffect(() => {
    setTab(getTabFromHash());
    setUnit(getUnit());
    const onHashChange = () => setTab(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
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
  // When signed in, Firestore subscription is the sole source of truth — never
  // read localStorage over it after a write.
  const onChange = user ? () => {} : reload;

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
        {tab === 'chart' && <OverviewTab entries={entries} goal={goal} unit={unit} loading={!dataReady} />}

        {tab === 'history' && (
          <div className="px-4 py-4 space-y-4">
            <WeightHistory uid={uid} entries={entries} unit={unit} goal={goal} onChange={onChange} />
          </div>
        )}

        {tab === 'settings' && (
          <SettingsTab
            uid={uid}
            user={user}
            onSignOut={handleSignOut}
            onUnitChange={setUnit}
            installPrompt={installPrompt}
            onInstalled={() => setInstallPrompt(null)}
            onImport={onChange}
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
        <LogModal uid={uid} entries={entries} unit={unit} onSave={onChange} onClose={() => setShowLog(false)} />
      )}

      <BottomNav active={tab} onChange={handleTabChange} />
    </main>
  );
}
