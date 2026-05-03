'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { deleteEntry, upsertEntry } from '@/lib/storage';
import { WeightEntry, Goal } from '@/types';
import { Unit, toDisplay } from '@/lib/units';
import { expectedWeightOnDate } from '@/lib/goalCalculator';
import { Trash2, NotebookPen } from 'lucide-react';

interface Props {
  entries: WeightEntry[];
  unit: Unit;
  goal: Goal | null;
  onChange: () => void;
}

function entryColor(entry: WeightEntry, goal: Goal | null, unit: Unit): string {
  if (!goal || entry.date < goal.startDate) return 'text-blue-600';
  const exp = expectedWeightOnDate(goal, entry.date);
  if (exp == null) return 'text-blue-600';
  const raw = toDisplay(entry.weight, unit) - toDisplay(exp, unit);
  const diff = goal.goalWeight > goal.startWeight ? -raw : raw;
  if (diff <= -1) return 'text-green-500';
  if (diff <= 0) return 'text-lime-500';
  if (diff <= 1) return 'text-orange-500';
  return 'text-red-500';
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export default function WeightHistory({ entries, unit, goal, onChange }: Props) {
  const isGainGoal = !!(goal && goal.goalWeight > goal.startWeight);
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const [pendingDelete, setPendingDelete] = useState<WeightEntry | null>(null);
  const [editingNote, setEditingNote] = useState<WeightEntry | null>(null);
  const [noteText, setNoteText] = useState('');

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteEntry(pendingDelete.id);
    setPendingDelete(null);
    onChange();
  }

  function openNoteEditor(entry: WeightEntry) {
    setEditingNote(entry);
    setNoteText(entry.note ?? '');
  }

  function saveNote() {
    if (!editingNote) return;
    upsertEntry({ date: editingNote.date, weight: editingNote.weight, note: noteText.trim() || undefined });
    setEditingNote(null);
    onChange();
  }

  if (sorted.length === 0) {
    return <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-6">No entries yet.</p>;
  }

  const diffs = new Map<string, number>();
  const chronological = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < chronological.length; i++) {
    const prev = toDisplay(chronological[i - 1].weight, unit);
    const curr = toDisplay(chronological[i].weight, unit);
    diffs.set(chronological[i].id, Math.round((curr - prev) * 10) / 10);
  }

  return (
    <>
      <div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {sorted.map(entry => {
              const diff = diffs.get(entry.id);
              return (
                <li key={entry.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{formatDate(entry.date)}</p>
                    {diff !== undefined && (
                      <p className={`text-xs ${diff === 0 ? 'text-gray-400' : (diff > 0) === isGainGoal ? 'text-green-500' : 'text-red-400'}`}>
                        {diff > 0 ? `+${diff}` : diff} {unit}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <span className={`text-base font-semibold mr-1 ${entryColor(entry, goal, unit)}`}>
                      {toDisplay(entry.weight, unit)} {unit}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-300 dark:text-gray-600 hover:text-blue-400 h-8 w-8 p-0"
                      onClick={() => openNoteEditor(entry)}
                    >
                      <NotebookPen size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-300 dark:text-gray-600 hover:text-red-400 h-8 w-8 p-0"
                      onClick={() => setPendingDelete(entry)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  </div>
                  {entry.note && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{entry.note}</p>
                  )}
                </li>
              );
            })}
          </ul>
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!pendingDelete} onOpenChange={open => { if (!open) setPendingDelete(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pendingDelete && `${formatDate(pendingDelete.date)} · ${toDisplay(pendingDelete.weight, unit)} ${unit}`}
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note editor */}
      <Dialog open={!!editingNote} onOpenChange={open => { if (!open) setEditingNote(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {editingNote?.note ? 'Edit note' : 'Add note'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">
            {editingNote && `${formatDate(editingNote.date)} · ${toDisplay(editingNote.weight, unit)} ${unit}`}
          </p>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Enter a note…"
            maxLength={120}
            rows={3}
            autoFocus
            className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={saveNote}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
