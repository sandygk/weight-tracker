'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseWeightFitCSV } from '@/lib/csvParser';
import { upsertEntry } from '@/lib/storage';
import { Upload } from 'lucide-react';

interface Props {
  onImport: () => void;
}

export default function CSVImport({ onImport }: Props) {
  const [status, setStatus] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;

    setStatus('Reading file…');
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target?.result as string;
        const entries = parseWeightFitCSV(text);
        if (entries.length === 0) {
          setStatus('No valid entries found. Is this a WeightFit CSV?');
          return;
        }
        entries.forEach(({ date, weight }) => upsertEntry({ date, weight }));
        setStatus(`✓ Imported ${entries.length} entries.`);
        onImport();
      } catch (err) {
        setStatus('Error parsing file. Please try again.');
        console.error(err);
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
        <CardTitle className="text-base">Import from WeightFit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-500">Import a WeightFit CSV export. Duplicate dates will be updated.</p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="block w-full text-sm text-gray-500
            file:mr-3 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-medium
            file:bg-blue-50 file:text-blue-600
            hover:file:bg-blue-100
            file:cursor-pointer cursor-pointer"
        />
        {status && <p className="text-sm text-green-600 font-medium">{status}</p>}
      </CardContent>
    </Card>
  );
}
