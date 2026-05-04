import { Goal } from '@/types';

export type ColorTier = 'green' | 'lime' | 'orange' | 'red' | 'default';

export const TIER_CLASS: Record<ColorTier, string> = {
  green: 'text-green-700',
  lime:  'text-green-500',
  orange: 'text-orange-500',
  red:   'text-red-500',
  default: 'text-gray-900 dark:text-gray-200',
};

export const TIER_STROKE: Record<ColorTier, string> = {
  green: '#15803d',
  lime:  '#22c55e',
  orange: '#f97316',
  red:   '#ef4444',
  default: '#6b7280',
};

export function goalColorTier(
  actualDisplay: number,
  expectedDisplay: number | null,
  isGainGoal: boolean,
): ColorTier {
  if (expectedDisplay == null) return 'default';
  const raw = actualDisplay - expectedDisplay;
  const diff = isGainGoal ? -raw : raw;
  if (diff <= -1) return 'green';
  if (diff <= 0)  return 'lime';
  if (diff <= 1)  return 'orange';
  return 'red';
}

export function goalEndDate(goal: Goal): string | null {
  if (!goal.weeklyLoss || goal.weeklyLoss <= 0) return null;
  const weeksNeeded = Math.abs(goal.startWeight - goal.goalWeight) / goal.weeklyLoss;
  if (weeksNeeded <= 0) return null;
  const d = new Date(goal.startDate + 'T12:00:00');
  d.setDate(d.getDate() + Math.ceil(weeksNeeded * 7));
  return d.toISOString().split('T')[0];
}

/** Returns the expected goal weight (in same units as goal) for a given date, or null if outside goal range. */
export function expectedWeightOnDate(goal: Goal, date: string): number | null {
  if (date < goal.startDate) return null;
  const endStr = goalEndDate(goal);
  if (!endStr) return null;
  if (date >= endStr) return goal.goalWeight;

  const start = new Date(goal.startDate + 'T12:00:00').getTime();
  const end = new Date(endStr + 'T12:00:00').getTime();
  const current = new Date(date + 'T12:00:00').getTime();
  const fraction = (current - start) / (end - start);
  return goal.startWeight - (goal.startWeight - goal.goalWeight) * fraction;
}

