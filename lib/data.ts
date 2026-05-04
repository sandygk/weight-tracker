// Unified data layer: routes writes to localStorage always, and also Firestore when signed in.
import * as ls from './storage';
import * as fs from './db';
import { WeightEntry, Goal } from '@/types';

export async function upsertEntry(uid: string | null, entry: Omit<WeightEntry, 'id'> & { id?: string }): Promise<void> {
  const saved = ls.upsertEntry(entry);
  if (uid) await fs.upsertEntry(uid, saved);
}

export async function deleteEntry(uid: string | null, id: string): Promise<void> {
  ls.deleteEntry(id);
  if (uid) await fs.deleteEntry(uid, id);
}

export async function saveGoal(uid: string | null, goal: Goal): Promise<void> {
  ls.saveGoal(goal);
  if (uid) await fs.saveGoal(uid, goal);
}

export async function clearGoal(uid: string | null): Promise<void> {
  ls.clearGoal();
  if (uid) await fs.clearGoal(uid);
}

export async function importEntries(uid: string | null, entries: WeightEntry[]): Promise<void> {
  for (const e of entries) ls.upsertEntry(e);
  if (uid) await fs.importEntries(uid, entries);
}
