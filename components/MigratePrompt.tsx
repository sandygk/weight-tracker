'use client';

import { useState } from 'react';
import { importEntries } from '@/lib/db';
import { WeightEntry } from '@/types';

interface Props {
  uid: string;
  entries: WeightEntry[];
  onDone: () => void;
}

export default function MigratePrompt({ uid, entries, onDone }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    setLoading(true);
    await importEntries(uid, entries);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xs shadow-2xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Import local data?</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            We found {entries.length} {entries.length === 1 ? 'entry' : 'entries'} stored locally on this device. Import them into your account?
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDone}
            disabled={loading}
            className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 font-medium rounded-xl py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
