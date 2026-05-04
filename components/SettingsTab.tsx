'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Unit, getUnit, saveUnit } from '@/lib/units';
import { exportCSV } from '@/lib/storage';
import { Theme, getTheme, saveTheme, applyTheme } from '@/lib/theme';
import CSVImport from '@/components/CSVImport';
import GoalSettings from '@/components/GoalSettings';
import SegmentedControl from '@/components/SegmentedControl';
import { Goal, WeightEntry } from '@/types';
import { Sun, Moon, Monitor, LogOut } from 'lucide-react';
import { User } from '@/lib/firebaseAuth';

interface Props {
  uid: string;
  user: User;
  onSignOut: () => void;
  onUnitChange: (unit: Unit) => void;
  installPrompt: any;
  onInstalled: () => void;
  onImport: () => void;
  goal: Goal | null;
  entries: WeightEntry[];
}

export default function SettingsTab({ uid, user, onSignOut, onUnitChange, installPrompt, onInstalled, onImport, goal, entries }: Props) {
  const [unit, setUnit] = useState<Unit>(() => getUnit());
  const [theme, setTheme] = useState<Theme>(() => getTheme());
  const [installed, setInstalled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
  );
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
  const isSecure = typeof window !== 'undefined' && window.isSecureContext;

  function handleTheme(t: Theme) {
    setTheme(t);
    saveTheme(t);
    applyTheme(t);
  }

  function handleUnit(u: Unit) {
    setUnit(u);
    saveUnit(u);
    onUnitChange(u);
  }

  function handleExport() {
    const csv = exportCSV(entries, unit);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weight-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      onInstalled();
    }
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{user.email ?? user.displayName ?? 'Signed in'}</p>
          <Button variant="outline" onClick={onSignOut} className="w-full flex items-center gap-2">
            <LogOut size={14} />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <GoalSettings key={unit} uid={uid} goal={goal} entries={entries} unit={unit} onSave={onImport} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Units</CardTitle>
        </CardHeader>
        <CardContent>
          <SegmentedControl
            options={[
              { id: 'lb' as Unit, label: 'lbs' },
              { id: 'kg' as Unit, label: 'kg' },
            ]}
            value={unit}
            onChange={handleUnit}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            All values are stored as lbs and converted for display.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <SegmentedControl
            options={[
              { id: 'light' as Theme, label: 'Light', Icon: Sun },
              { id: 'system' as Theme, label: 'System', Icon: Monitor },
              { id: 'dark' as Theme, label: 'Dark', Icon: Moon },
            ]}
            value={theme}
            onChange={handleTheme}
          />
        </CardContent>
      </Card>

      <CSVImport uid={uid} onImport={onImport} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleExport} className="w-full">
            Download CSV
          </Button>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Exports all entries in {unit} with notes included.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Install App</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {installed ? (
            <p className="text-sm text-green-600 font-medium">✓ Running as installed app</p>
          ) : installPrompt ? (
            <Button onClick={handleInstall} className="w-full">
              Install App
            </Button>
          ) : isIOS ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tap the <strong>Share</strong> button in Safari, then tap <strong>Add to Home Screen</strong>.
            </p>
          ) : isAndroid ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tap the <strong>⋮</strong> menu in Chrome, then tap <strong>Add to Home Screen</strong> or <strong>Install App</strong>.
            </p>
          ) : !isSecure ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Install requires HTTPS.
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Open the browser menu and select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
