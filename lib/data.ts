// Unified data layer: routes writes to localStorage always, and also Firestore when signed in.
import * as ls from './storage';
import * as fs from './db';
import { dlog } from './debugLog';
import { WeightEntry, Goal } from '@/types';

export async function upsertEntry(uid: string | null, entry: Omit<WeightEntry, 'id'> & { id?: string }): Promise<void> {
  const saved = ls.upsertEntry(entry);
  dlog(`upsertEntry uid=${uid ?? 'null'} date=${entry.date} weight=${entry.weight}`);
  if (uid) {
    try {
      await fs.upsertEntry(uid, saved);
      dlog(`upsertEntry Firestore OK date=${entry.date}`);
    } catch (e) {
      dlog(`upsertEntry Firestore ERROR: ${e}`);
      throw e;
    }
  }
}

export async function deleteEntry(uid: string | null, id: string): Promise<void> {
  ls.deleteEntry(id);
  dlog(`deleteEntry uid=${uid ?? 'null'} id=${id}`);
  if (uid) {
    try {
      await fs.deleteEntry(uid, id);
      dlog(`deleteEntry Firestore OK id=${id}`);
    } catch (e) {
      dlog(`deleteEntry Firestore ERROR: ${e}`);
      throw e;
    }
  }
}

export async function saveGoal(uid: string | null, goal: Goal): Promise<void> {
  ls.saveGoal(goal);
  dlog(`saveGoal uid=${uid ?? 'null'}`);
  if (uid) {
    try {
      await fs.saveGoal(uid, goal);
      dlog(`saveGoal Firestore OK`);
    } catch (e) {
      dlog(`saveGoal Firestore ERROR: ${e}`);
      throw e;
    }
  }
}

export async function clearGoal(uid: string | null): Promise<void> {
  ls.clearGoal();
  if (uid) await fs.clearGoal(uid);
}

export async function importEntries(uid: string | null, entries: WeightEntry[]): Promise<void> {
  for (const e of entries) ls.upsertEntry(e);
  dlog(`importEntries uid=${uid ?? 'null'} count=${entries.length}`);
  if (uid) {
    try {
      await fs.importEntries(uid, entries);
      dlog(`importEntries Firestore OK count=${entries.length}`);
    } catch (e) {
      dlog(`importEntries Firestore ERROR: ${e}`);
      throw e;
    }
  }
}
