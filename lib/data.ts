// When signed in: writes go to Firestore only (subscription updates state).
// When not signed in: writes go to localStorage only.
import * as ls from './storage';
import * as fs from './db';
import { dlog } from './debugLog';
import { WeightEntry, Goal } from '@/types';

export async function upsertEntry(uid: string | null, entry: Omit<WeightEntry, 'id'> & { id?: string }): Promise<void> {
  dlog(`upsertEntry uid=${uid ?? 'null'} date=${entry.date} weight=${entry.weight}`);
  if (uid) {
    try {
      await fs.upsertEntry(uid, entry);
      dlog(`upsertEntry Firestore OK date=${entry.date}`);
    } catch (e) {
      dlog(`upsertEntry Firestore ERROR: ${e}`);
      throw e;
    }
  } else {
    ls.upsertEntry(entry);
  }
}

export async function deleteEntry(uid: string | null, id: string): Promise<void> {
  dlog(`deleteEntry uid=${uid ?? 'null'} id=${id}`);
  if (uid) {
    try {
      await fs.deleteEntry(uid, id);
      dlog(`deleteEntry Firestore OK id=${id}`);
    } catch (e) {
      dlog(`deleteEntry Firestore ERROR: ${e}`);
      throw e;
    }
  } else {
    ls.deleteEntry(id);
  }
}

export async function saveGoal(uid: string | null, goal: Goal): Promise<void> {
  dlog(`saveGoal uid=${uid ?? 'null'}`);
  if (uid) {
    try {
      await fs.saveGoal(uid, goal);
      dlog(`saveGoal Firestore OK`);
    } catch (e) {
      dlog(`saveGoal Firestore ERROR: ${e}`);
      throw e;
    }
  } else {
    ls.saveGoal(goal);
  }
}

export async function clearGoal(uid: string | null): Promise<void> {
  if (uid) await fs.clearGoal(uid);
  else ls.clearGoal();
}

export async function importEntries(uid: string | null, entries: WeightEntry[]): Promise<void> {
  dlog(`importEntries uid=${uid ?? 'null'} count=${entries.length}`);
  if (uid) {
    try {
      await fs.importEntries(uid, entries);
      dlog(`importEntries Firestore OK count=${entries.length}`);
    } catch (e) {
      dlog(`importEntries Firestore ERROR: ${e}`);
      throw e;
    }
  } else {
    for (const e of entries) ls.upsertEntry(e);
  }
}
