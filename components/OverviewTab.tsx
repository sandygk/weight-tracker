'use client';

import { useState, useMemo } from 'react';
import WeightChart from './WeightChart';
import { WeightEntry, Goal } from '@/types';
import { goalEndDate, expectedWeightOnDate } from '@/lib/goalCalculator';
import { Unit, toDisplay } from '@/lib/units';
import { upsertEntry } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';

const RANGE_KEY = 'wt-range';

const STATIC_RANGES = [
  { label: '1W', name: '1W',   days: 7 },
  { label: '1M', name: '1M',  days: 30 },
  { label: '3M', name: '3M', days: 90 },
  { label: '6M', name: '6M', days: 180 },
  { label: 'ALL', name: 'All', days: Infinity },
] as const;

type StaticRange = typeof STATIC_RANGES[number]['label'];
type RangeLabel = StaticRange | 'Since' | 'Goal';

function loadRange(): RangeLabel {
  if (typeof window === 'undefined') return '3M';
  return (localStorage.getItem(RANGE_KEY) as RangeLabel) ?? '3M';
}

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

interface Props {
  entries: WeightEntry[];
  goal: Goal | null;
  unit: Unit;
  onChange: () => void;
}

export default function OverviewTab({ entries, goal, unit, onChange }: Props) {
  const [range, setRange] = useState<RangeLabel>(() => loadRange());
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [noteText, setNoteText] = useState('');

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries],
  );

  const goalEnd = goal ? goalEndDate(goal) : null;
  const todayStr = new Date().toISOString().split('T')[0];
  const goalIsFuture = !!goalEnd && goalEnd > todayStr;

  const activeRange: RangeLabel =
    (range === 'Goal' || range === 'Since') && !goal ? '3M'
    : range === 'Goal' && !goalIsFuture ? 'Since'
    : range;

  function handleRangeChange(r: RangeLabel) {
    setRange(r);
    localStorage.setItem(RANGE_KEY, r);
  }

  function openNoteEditor(entry: WeightEntry) {
    setEditingEntry(entry);
    setNoteText(entry.note ?? '');
  }

  function saveNote() {
    if (!editingEntry) return;
    upsertEntry({ date: editingEntry.date, weight: editingEntry.weight, note: noteText.trim() || undefined });
    setEditingEntry(null);
    onChange();
  }

  const rangeEntries = useMemo(() => {
    if (activeRange === 'Since' || activeRange === 'Goal') {
      if (!goal) return sorted;
      return sorted.filter(e => e.date >= goal.startDate);
    }
    const r = STATIC_RANGES.find(r => r.label === activeRange)!;
    if (!isFinite(r.days)) return sorted;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - r.days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return sorted.filter(e => e.date >= cutoffStr);
  }, [sorted, activeRange, goal]);

  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const rangeFirst = rangeEntries.length > 0 ? rangeEntries[0] : null;

  const change =
    latest && rangeFirst && latest.id !== rangeFirst.id
      ? Math.round((latest.weight - rangeFirst.weight) * 10) / 10
      : null;

  const remaining =
    goal && latest
      ? Math.round((latest.weight - goal.goalWeight) * 10) / 10
      : null;

  const currentColor = (() => {
    if (!goal || !latest) return 'text-blue-600';
    const exp = expectedWeightOnDate(goal, todayStr);
    if (exp == null) return 'text-blue-600';
    const diff = toDisplay(latest.weight, unit) - toDisplay(exp, unit);
    if (diff <= 0) return 'text-green-500';
    if (diff <= 1) return 'text-orange-500';
    return 'text-red-500';
  })();

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-300">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        <p className="text-sm font-medium text-gray-400">No data yet</p>
        <p className="text-xs text-gray-300 text-center px-8">Tap + to log your weight, or import a CSV</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-4 pb-2">
      {/* Title + range picker */}
      <div className="flex items-center justify-between px-5 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Overview</h1>
        <select
          value={activeRange}
          onChange={e => handleRangeChange(e.target.value as RangeLabel)}
          className="text-xs font-semibold bg-gray-100 text-gray-600 rounded-full px-3 py-1.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {STATIC_RANGES.map(r => (
            <option key={r.label} value={r.label}>{r.name}</option>
          ))}
          {goal && <option value="Since">Since goal</option>}
          {goal && goalIsFuture && <option value="Goal">Full journey</option>}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 text-center px-2 pb-4">
        {/* Start */}
        <div className="flex flex-col items-center gap-0.5 px-2">
          <p className="text-xs text-gray-400">Start</p>
          <p className="text-2xl font-bold text-gray-700 leading-tight">
            {rangeFirst ? toDisplay(rangeFirst.weight, unit) : '—'}
            {rangeFirst && <span className="text-sm font-medium text-gray-500 ml-1">{unit}</span>}
          </p>
          {rangeFirst && (
            <p className="text-xs text-gray-400 mt-0.5">{formatShortDate(rangeFirst.date)}</p>
          )}
        </div>

        {/* Current */}
        <div className="flex flex-col items-center gap-0.5 px-2 border-x border-gray-100">
          <p className="text-xs text-gray-400">Current</p>
          <p className={`text-2xl font-bold leading-tight ${currentColor}`}>
            {latest ? toDisplay(latest.weight, unit) : '—'}
            {latest && <span className="text-sm font-medium ml-1 opacity-70">{unit}</span>}
          </p>
          {change !== null && (
            <p className={`text-xs font-semibold mt-0.5 ${change > 0 ? 'text-red-500' : change < 0 ? 'text-green-500' : 'text-gray-400'}`}>
              {change > 0 ? '+' : ''}{toDisplay(change, unit)} {unit}
            </p>
          )}
        </div>

        {/* Goal */}
        <div className="flex flex-col items-center gap-0.5 px-2">
          <p className="text-xs text-gray-400">Goal</p>
          <p className="text-2xl font-bold text-gray-700 leading-tight">
            {goal ? toDisplay(goal.goalWeight, unit) : '—'}
            {goal && <span className="text-sm font-medium text-gray-500 ml-1">{unit}</span>}
          </p>
          {remaining !== null && (
            <p className={`text-xs mt-0.5 ${remaining <= 0 ? 'text-green-500 font-semibold' : 'text-gray-400'}`}>
              {remaining <= 0 ? 'Reached!' : `${toDisplay(remaining, unit)} ${unit} to go`}
            </p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="mx-1">
        <WeightChart
          entries={rangeEntries}
          goal={goal}
          unit={unit}
          extendGoalLine={activeRange === 'Goal'}
          onDotClick={openNoteEditor}
        />
      </div>

      {/* Note editor */}
      <Dialog open={!!editingEntry} onOpenChange={open => { if (!open) setEditingEntry(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {editingEntry?.note ? 'Edit note' : 'Add note'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-400 -mt-1">
            {editingEntry && `${formatShortDate(editingEntry.date)} · ${toDisplay(editingEntry.weight, unit)} ${unit}`}
          </p>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Enter a note…"
            maxLength={120}
            rows={3}
            autoFocus
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={saveNote}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
