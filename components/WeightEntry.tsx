'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { upsertEntry } from '@/lib/storage';
import { WeightEntry } from '@/types';

interface Props {
  entries: WeightEntry[];
  onSave: () => void;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export default function WeightEntryForm({ entries, onSave }: Props) {
  const todayStr = today();
  const existing = entries.find(e => e.date === todayStr);

  const [date, setDate] = useState(todayStr);
  const [weight, setWeight] = useState(existing ? String(existing.weight) : '');
  const [saved, setSaved] = useState(false);

  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const diff = latestEntry && weight
    ? Math.round((parseFloat(weight) - latestEntry.weight) * 10) / 10
    : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return;
    upsertEntry({ date, weight: w });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSave();
  }

  const entryForDate = entries.find(e => e.date === date);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Log Weight</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              max={todayStr}
              onChange={e => {
                setDate(e.target.value);
                const found = entries.find(en => en.date === e.target.value);
                setWeight(found ? String(found.weight) : '');
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="weight">
              Weight (lbs)
              {entryForDate && (
                <span className="ml-2 text-xs text-gray-400">already logged: {entryForDate.weight} lbs</span>
              )}
            </Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="50"
              max="700"
              placeholder="e.g. 185.4"
              value={weight}
              onChange={e => setWeight(e.target.value)}
            />
          </div>

          {diff !== null && (
            <p className={`text-sm font-medium ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-600' : 'text-gray-400'}`}>
              {diff > 0 ? `+${diff}` : diff} lbs vs previous
            </p>
          )}

          <Button type="submit" className="w-full">
            {saved ? '✓ Saved!' : entryForDate ? 'Update' : 'Save'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
