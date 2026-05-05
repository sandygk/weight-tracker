'use client';

import { useState, useMemo, useEffect } from 'react';
import WeightChart from './WeightChart';
import { WeightEntry, Goal } from '@/types';
import { goalEndDate, expectedWeightOnDate, goalColorTier, TIER_CLASS } from '@/lib/goalCalculator';
import { Unit, toDisplay } from '@/lib/units';
import { localDateStr } from '@/lib/date';

const RANGE_KEY = 'wt-range';

const STATIC_RANGES = [
  { label: '1W',  name: '1W',  days: 7 },
  { label: '1M',  name: '1M',  days: 30 },
  { label: '3M',  name: '3M',  days: 90 },
  { label: '6M',  name: '6M',  days: 180 },
  { label: '1Y',  name: '1Y',  days: 365 },
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
  loading?: boolean;
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col pt-4 pb-2 animate-pulse">
      <div className="flex items-center justify-between px-5 mb-4">
        <div className="h-7 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-7 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
      </div>
      <div className="grid grid-cols-3 text-center px-2 pb-7 gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded-lg" />
            <div className="h-3 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
      <div className="mx-1 h-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
    </div>
  );
}

export default function OverviewTab({ entries, goal, unit, loading = false }: Props) {
  const [range, setRange] = useState<RangeLabel>('3M');
  useEffect(() => { setRange(loadRange()); }, []);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries],
  );

  const goalEnd = goal ? goalEndDate(goal) : null;
  const todayStr = localDateStr();
  const goalIsFuture = !!goalEnd && goalEnd > todayStr;

  const activeRange: RangeLabel =
    (range === 'Goal' || range === 'Since') && !goal ? '3M'
    : range === 'Goal' && !goalIsFuture ? 'Since'
    : range;

  function handleRangeChange(r: RangeLabel) {
    setRange(r);
    localStorage.setItem(RANGE_KEY, r);
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
    const cutoffStr = localDateStr(cutoff);
    return sorted.filter(e => e.date >= cutoffStr);
  }, [sorted, activeRange, goal]);

  if (loading) return <OverviewSkeleton />;

  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const rangeFirst = rangeEntries.length > 0 ? rangeEntries[0] : null;

  // Total change from first entry in selected range to latest overall
  const totalChange = (latest && rangeFirst && latest.id !== rangeFirst.id)
    ? Math.round((toDisplay(latest.weight, unit) - toDisplay(rangeFirst.weight, unit)) * 10) / 10
    : null;

  // Today's goal target and delta
  const todayTarget = goal ? expectedWeightOnDate(goal, todayStr) : null;
  const todayTargetDisplay = todayTarget != null
    ? Math.round(toDisplay(todayTarget, unit) * 10) / 10
    : null;
  const todayDelta = (todayTargetDisplay != null && latest)
    ? Math.round((toDisplay(latest.weight, unit) - todayTargetDisplay) * 10) / 10
    : null;

  // How much remains to reach the end goal
  const remainingToGoal = (goal && latest)
    ? Math.round((toDisplay(latest.weight, unit) - toDisplay(goal.goalWeight, unit)) * 10) / 10
    : null;

  const isGainGoal = !!(goal && goal.goalWeight > goal.startWeight);

  const currentColor = (() => {
    if (!goal || !latest) return TIER_CLASS.default;
    const exp = expectedWeightOnDate(goal, todayStr);
    return TIER_CLASS[goalColorTier(toDisplay(latest.weight, unit), exp != null ? toDisplay(exp, unit) : null, isGainGoal)];
  })();

  const deltaColor = (todayTarget != null && latest)
    ? TIER_CLASS[goalColorTier(toDisplay(latest.weight, unit), toDisplay(todayTarget, unit), isGainGoal)]
    : 'text-gray-400';

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-300 dark:text-gray-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No data yet</p>
        <p className="text-xs text-gray-300 dark:text-gray-600 text-center px-8">Tap + to log your weight, or import a CSV</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-4 pb-2">
      {/* Title + range picker */}
      <div className="flex items-center justify-between px-5 mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Overview</h1>
        <select
          value={activeRange}
          onChange={e => handleRangeChange(e.target.value as RangeLabel)}
          className="appearance-none bg-transparent text-xs font-semibold text-gray-500 dark:text-gray-400 cursor-pointer focus:outline-none text-right"
        >
          {goal && <option value="Since">Since diet start</option>}
          {goal && goalIsFuture && <option value="Goal">Diet start to end</option>}
          {STATIC_RANGES.map(r => (
            <option key={r.label} value={r.label}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Stats: Start | Today | End Goal */}
      <div className="grid grid-cols-3 text-center px-2 pb-7">
        {/* Start */}
        <div className="flex flex-col items-center gap-0.5 px-1">
          <p className="text-xs text-gray-400 dark:text-gray-500">Start · {rangeFirst ? formatShortDate(rangeFirst.date) : '—'}</p>
          <p className="text-2xl font-bold text-gray-700 dark:text-gray-200 leading-tight">
            {rangeFirst ? toDisplay(rangeFirst.weight, unit) : '—'}
            {rangeFirst && <span className="text-sm font-medium text-gray-500 dark:text-gray-400 ml-0.5">{unit}</span>}
          </p>
          {totalChange !== null && (
            <>
              <p className={`text-xs font-semibold ${totalChange === 0 ? 'text-gray-400' : (totalChange > 0) === isGainGoal ? 'text-green-500' : 'text-red-500'}`}>
                {totalChange > 0 ? '+' : ''}{totalChange} {unit}
              </p>
              <p className="text-gray-400 dark:text-gray-500 font-normal" style={{ fontSize: 10 }}>since start</p>
            </>
          )}
        </div>

        {/* Today */}
        <div className="flex flex-col items-center gap-0.5 px-1 border-x border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">Today · {formatShortDate(todayStr)}</p>
          <p className={`text-2xl font-bold leading-tight ${currentColor}`}>
            {latest ? toDisplay(latest.weight, unit) : '—'}
            {latest && <span className="text-sm font-medium ml-0.5 opacity-70">{unit}</span>}
          </p>
          {todayDelta !== null && (
            <>
              <p className={`text-xs font-semibold ${deltaColor}`}>
                {todayDelta > 0 ? '+' : ''}{todayDelta} {unit}
              </p>
              <p className="text-gray-400 dark:text-gray-500 font-normal" style={{ fontSize: 10 }}>from target</p>
            </>
          )}
        </div>

        {/* End Goal */}
        <div className="flex flex-col items-center gap-0.5 px-1">
          <p className="text-xs text-gray-400 dark:text-gray-500">End · {goalEnd ? formatShortDate(goalEnd) : '—'}</p>
          <p className="text-2xl font-bold text-gray-700 dark:text-gray-200 leading-tight">
            {goal ? toDisplay(goal.goalWeight, unit) : '—'}
            {goal && <span className="text-sm font-medium text-gray-500 dark:text-gray-400 ml-0.5">{unit}</span>}
          </p>
          {remainingToGoal !== null && (
            (isGainGoal ? remainingToGoal >= 0 : remainingToGoal <= 0)
              ? <p className="text-xs font-semibold text-green-500">Reached!</p>
              : <>
                  <p className="text-xs font-semibold text-blue-500">
                    {Math.abs(remainingToGoal).toFixed(1)} {unit}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 font-normal" style={{ fontSize: 10 }}>{isGainGoal ? 'to gain' : 'to go'}</p>
                </>
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
        />
      </div>
    </div>
  );
}
