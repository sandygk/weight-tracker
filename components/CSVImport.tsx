'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { importEntries, saveGoal } from '@/lib/data';
import { WeightEntry, Goal } from '@/types';

interface Props {
  uid: string | null;
  onImport: () => void;
}

export default function DataImport({ uid, onImport }: Props) {
  const [status, setStatus] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;

    setStatus('Reading file…');
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const text = ev.target?.result as string;
        const data = JSON.parse(text);
        if (!Array.isArray(data.entries)) {
          setStatus('Invalid file. Expected a Weight Tracker JSON export.');
          return;
        }
        const entries: WeightEntry[] = data.entries;
        const goal: Goal | null = data.goal ?? null;
        await importEntries(uid, entries);
        if (goal) await saveGoal(uid, goal);
        setStatus(`✓ Imported ${entries.length} entries${goal ? ' and goal' : ''}.`);
        onImport();
      } catch {
        setStatus('Could not parse file. Make sure it is a Weight Tracker JSON export.');
      } finally {
        input.value = '';
      }
    };
    reader.onerror = () => setStatus('Could not read file. Please try again.');
    reader.readAsText(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Import a JSON backup. Duplicate dates will be updated.</p>
        <input
          type="file"
          accept=".json"
          onChange={handleFile}
          className="block w-full text-sm text-gray-500 dark:text-gray-400
            file:mr-3 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-medium
            file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-600 dark:file:text-blue-400
            hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60
            file:cursor-pointer cursor-pointer"
        />
        {status && <p className="text-sm text-green-600 dark:text-green-400 font-medium">{status}</p>}
      </CardContent>
    </Card>
  );
}
