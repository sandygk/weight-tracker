import { Goal } from '@/types';

export interface GoalPoint {
  date: string;
  goalWeight: number;
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

export function calculateGoalLine(goal: Goal): GoalPoint[] {
  const endStr = goalEndDate(goal);
  if (!endStr) return [];

  const start = new Date(goal.startDate + 'T12:00:00');
  const end = new Date(endStr + 'T12:00:00');
  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) return [];

  const totalDays = Math.ceil(totalMs / 86400000);
  const totalLoss = goal.startWeight - goal.goalWeight;
  const points: GoalPoint[] = [];

  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const gw = Math.round((goal.startWeight - (totalLoss * i) / totalDays) * 10) / 10;
    points.push({ date: d.toISOString().split('T')[0], goalWeight: gw });
  }

  return points;
}
