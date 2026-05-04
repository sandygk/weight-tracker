import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  writeBatch, getDocs, Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { WeightEntry, Goal } from '@/types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const entriesCol = (uid: string) => collection(db, 'users', uid, 'entries');
const goalDocRef = (uid: string) => doc(db, 'users', uid, 'goal');

export function subscribeEntries(uid: string, cb: (entries: WeightEntry[]) => void): Unsubscribe {
  return onSnapshot(
    entriesCol(uid),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as WeightEntry)).sort((a, b) => a.date.localeCompare(b.date))),
    () => {},
  );
}

export function subscribeGoal(uid: string, cb: (goal: Goal | null) => void): Unsubscribe {
  return onSnapshot(
    goalDocRef(uid),
    snap => cb(snap.exists() ? (snap.data() as Goal) : null),
    () => {},
  );
}

export async function upsertEntry(uid: string, entry: Omit<WeightEntry, 'id'> & { id?: string }): Promise<string> {
  const id = entry.id ?? generateId();
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
    batch.set(doc(entriesCol(uid), entry.id), data);
  }
  await batch.commit();
}
