import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  writeBatch, getDocs, Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { dlog } from './debugLog';
import { WeightEntry, Goal } from '@/types';

const entriesCol = (uid: string) => collection(db, 'users', uid, 'entries');
const goalDocRef = (uid: string) => doc(db, 'users', uid, 'data', 'goal');

export function subscribeEntries(uid: string, cb: (entries: WeightEntry[]) => void): Unsubscribe {
  return onSnapshot(
    entriesCol(uid),
    snap => {
      dlog(`subscribeEntries count=${snap.docs.length} pending=${snap.metadata.hasPendingWrites} fromCache=${snap.metadata.fromCache}`);
      cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as WeightEntry)).sort((a, b) => a.date.localeCompare(b.date)));
    },
    e => dlog(`subscribeEntries ERROR: ${e}`),
  );
}

export function subscribeGoal(uid: string, cb: (goal: Goal | null) => void): Unsubscribe {
  return onSnapshot(
    goalDocRef(uid),
    snap => {
      dlog(`subscribeGoal exists=${snap.exists()} pending=${snap.metadata.hasPendingWrites} fromCache=${snap.metadata.fromCache}`);
      cb(snap.exists() ? (snap.data() as Goal) : null);
    },
    e => dlog(`subscribeGoal ERROR: ${e}`),
  );
}

export async function upsertEntry(uid: string, entry: Omit<WeightEntry, 'id'> & { id?: string }): Promise<string> {
  // Use date as document ID — guarantees one doc per date across all devices.
  const id = entry.date;
  const data: Record<string, unknown> = { date: entry.date, weight: entry.weight };
  if (entry.note) data.note = entry.note;
  await setDoc(doc(entriesCol(uid), id), data);
  return id;
}

export async function deleteEntry(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(entriesCol(uid), id));
}

export async function saveGoal(uid: string, goal: Goal): Promise<void> {
  await setDoc(goalDocRef(uid), goal);
}

export async function clearGoal(uid: string): Promise<void> {
  await deleteDoc(goalDocRef(uid));
}

export async function getEntriesOnce(uid: string): Promise<WeightEntry[]> {
  const snap = await getDocs(entriesCol(uid));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as WeightEntry));
}

export async function importEntries(uid: string, entries: WeightEntry[]): Promise<void> {
  const batch = writeBatch(db);
  for (const entry of entries) {
    const data: Record<string, unknown> = { date: entry.date, weight: entry.weight };
    if (entry.note) data.note = entry.note;
    // Use date as document ID for consistency with upsertEntry.
    batch.set(doc(entriesCol(uid), entry.date), data);
  }
  await batch.commit();
}

// One-time migration: converts random-ID docs to date-ID docs.
// Safe to call on every sign-in — no-ops once already migrated.
export async function migrateToDateIds(uid: string): Promise<void> {
  const snap = await getDocs(entriesCol(uid));
  const isDateId = (id: string) => /^\d{4}-\d{2}-\d{2}$/.test(id);

  const dateIdSet = new Set(snap.docs.filter(d => isDateId(d.id)).map(d => d.id));
  const toMigrate = snap.docs.filter(d => !isDateId(d.id));
  if (toMigrate.length === 0) return;

  dlog(`migrateToDateIds migrating ${toMigrate.length} docs`);
  const batch = writeBatch(db);
  for (const d of toMigrate) {
    const data = d.data() as WeightEntry;
    if (!dateIdSet.has(data.date)) {
      const entryData: Record<string, unknown> = { date: data.date, weight: data.weight };
      if (data.note) entryData.note = data.note;
      batch.set(doc(entriesCol(uid), data.date), entryData);
      dateIdSet.add(data.date);
    }
    batch.delete(doc(entriesCol(uid), d.id));
  }
  await batch.commit();
  dlog(`migrateToDateIds done`);
}
