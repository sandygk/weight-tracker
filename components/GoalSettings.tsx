'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { saveGoal, clearGoal } from '@/lib/storage';
import { goalEndDate } from '@/lib/goalCalculator';
import { Goal, WeightEntry } from '@/types';
import { Unit, toDisplay, toStorage } from '@/lib/units';
import { Target, Trash2 } from 'lucide-react';

interface Props {
  goal: Goal | null;
  entries: WeightEntry[];
  unit: Unit;
  onSave: () => void;
}

function closestEntry(entries: WeightEntry[], date: string): WeightEntry | null {
  if (entries.length === 0) return null;
  const target = new Date(date).getTime();
  return entries.reduce((best, e) => {
    const eDiff = Math.abs(new Date(e.date).getTime() - target);
    const bDiff = Math.abs(new Date(best.date).getTime() - target);
    if (eDiff < bDiff) return e;
    if (eDiff === bDiff) return e.date < best.date ? e : best;
    return best;
  });
}

export default function GoalSettings({ goal, entries, unit, onSave }: Props) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  const defaultStartWeight = goal?.startWeight
    ? toDisplay(goal.startWeight, unit)
    : latest ? toDisplay(latest.weight, unit) : '';

  const defaultWeeklyLoss = goal?.weeklyLoss
    ? toDisplay(goal.weeklyLoss, unit)
    : unit === 'kg' ? 0.5 : 1;

  const [startDate, setStartDate] = useState(goal?.startDate ?? new Date().toISOString().split('T')[0]);
  const [startWeight, setStartWeight] = useState(String(defaultStartWeight));
  const [goalWeight, setGoalWeight] = useState(String(goal?.goalWeight ? toDisplay(goal.goalWeight, unit) : ''));
  const [weeklyLoss, setWeeklyLoss] = useState(String(defaultWeeklyLoss));
  const isFirstRender = useRef(true);

  // auto-fill start weight from closest entry when start date changes
  useEffect(() => {
    const entry = closestEntry(entries, startDate);
    if (entry) setStartWeight(String(toDisplay(entry.weight, unit)));
  }, [startDate, entries]);

  // auto-save whenever valid values change (skip on first render)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const sw = parseFloat(startWeight);
    const gw = parseFloat(goalWeight);
    const wl = parseFloat(weeklyLoss);
    if (isNaN(sw) || isNaN(gw) || isNaN(wl) || wl <= 0 || sw === gw) return;
    const t = setTimeout(() => {
      saveGoal({
        startDate,
        startWeight: toStorage(sw, unit),
        goalWeight: toStorage(gw, unit),
        weeklyLoss: toStorage(wl, unit),
      });
      onSave();
    }, 600);
    return () => clearTimeout(t);
  }, [startDate, startWeight, goalWeight, weeklyLoss]);

  const sw = parseFloat(startWeight);
  const gw = parseFloat(goalWeight);
  const wl = parseFloat(weeklyLoss);

  const isGainGoalForm = !isNaN(sw) && !isNaN(gw) && gw > sw;

  // preview uses display-unit values; since goalEndDate uses ratios (sw-gw)/wl the unit cancels out
  const preview = !isNaN(sw) && !isNaN(gw) && !isNaN(wl) && wl > 0 && sw !== gw
    ? goalEndDate({ startDate, startWeight: toStorage(sw, unit), goalWeight: toStorage(gw, unit), weeklyLoss: toStorage(wl, unit) })
    : null;

  const weeksNeeded = preview && !isNaN(sw) && !isNaN(gw) && !isNaN(wl)
    ? Math.ceil(Math.abs(sw - gw) / wl)
    : null;

  function handleClear() {
    clearGoal();
    onSave();
  }

  const formatPreview = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Goal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startWeight">Start Weight ({unit})</Label>
              <Input
                id="startWeight"
                type="number"
                step="0.1"
                value={startWeight}
                placeholder={unit === 'kg' ? '84' : '185'}
                onChange={e => setStartWeight(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goalWeight">Goal Weight ({unit})</Label>
              <Input
                id="goalWeight"
                type="number"
                step="0.1"
                value={goalWeight}
                placeholder={unit === 'kg' ? '73' : '160'}
                onChange={e => setGoalWeight(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weeklyLoss">{isGainGoalForm ? 'Gain' : 'Loss'} per week ({unit})</Label>
              <Input
                id="weeklyLoss"
                type="number"
                step="0.1"
                min="0.1"
                max={unit === 'kg' ? '2.3' : '5'}
                value={weeklyLoss}
                placeholder={unit === 'kg' ? '0.5' : '1.0'}
                onChange={e => setWeeklyLoss(e.target.value)}
              />
            </div>
          </div>

          {preview && weeksNeeded && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 px-4 py-3 flex items-center gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Target size={15} className="text-blue-500 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">{formatPreview(preview)}</p>
                <p className="text-xs text-blue-400 dark:text-blue-500 mt-0.5">
                  {weeksNeeded} wks · {isGainGoalForm ? 'gaining' : 'losing'} {(Math.abs(sw - gw) / weeksNeeded).toFixed(1)} {unit}/wk
                </p>
              </div>
            </div>
          )}

          {sw === gw && !isNaN(sw) && !isNaN(gw) && sw > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Goal weight must differ from start weight.
            </p>
          )}

          {goal && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/50 text-red-400 dark:text-red-400 text-sm font-medium py-2.5 flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
              Clear Goal
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
