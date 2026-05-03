'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Unit, getUnit, saveUnit } from '@/lib/units';
import { exportCSV } from '@/lib/storage';
import CSVImport from '@/components/CSVImport';
import GoalSettings from '@/components/GoalSettings';
import { Goal, WeightEntry } from '@/types';

interface Props {
  onUnitChange: (unit: Unit) => void;
  installPrompt: any;
  onInstalled: () => void;
  onImport: () => void;
  goal: Goal | null;
  entries: WeightEntry[];
}

export default function SettingsTab({ onUnitChange, installPrompt, onInstalled, onImport, goal, entries }: Props) {
  const [unit, setUnit] = useState<Unit>(() => getUnit());
  const [installed, setInstalled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
  );
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSecure = typeof window !== 'undefined' && window.isSecureContext;

  function handleUnit(u: Unit) {
    setUnit(u);
    saveUnit(u);
    onUnitChange(u);
  }

  function handleExport() {
    const csv = exportCSV(unit);
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
      <GoalSettings key={unit} goal={goal} entries={entries} unit={unit} onSave={onImport} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Units</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex rounded-xl overflow-hidden border border-gray-200 w-fit">
            <button
              type="button"
              onClick={() => handleUnit('lb')}
              className={`px-6 py-2 text-sm font-semibold transition-colors ${
                unit === 'lb'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              lbs
            </button>
            <button
              type="button"
              onClick={() => handleUnit('kg')}
              className={`px-6 py-2 text-sm font-semibold transition-colors border-l border-gray-200 ${
                unit === 'kg'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              kg
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            All values are stored as lbs and converted for display.
          </p>
        </CardContent>
      </Card>

      <CSVImport onImport={onImport} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleExport} className="w-full">
            Download CSV
          </Button>
          <p className="text-xs text-gray-400">
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
            <p className="text-xs text-gray-500">
              Tap the Share button in Safari, then <strong>Add to Home Screen</strong>.
            </p>
          ) : !isSecure ? (
            <p className="text-xs text-gray-500">
              Install requires HTTPS. Open this app from a deployed URL (e.g. Vercel) and the install button will appear here automatically.
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              Reload the page — the install button will appear once the browser is ready.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
