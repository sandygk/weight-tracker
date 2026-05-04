import { WeightEntry, Goal } from '@/types';
import { Unit, toDisplay } from './units';

const KEY = 'wt-data';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface Store {
  entries: WeightEntry[];
  goal: Goal | null;
}

function load(): Store {
  if (typeof window === 'undefined') return { entries: [], goal: null };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { entries: [], goal: null };
  } catch {
    return { entries: [], goal: null };
  }
}

function save(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function getEntries(): WeightEntry[] {
  return load().entries.sort((a, b) => a.date.localeCompare(b.date));
}

export function upsertEntry(entry: Omit<WeightEntry, 'id'>): WeightEntry {
  const store = load();
  const existing = store.entries.findIndex(e => e.date === entry.date);
  const newEntry: WeightEntry = { ...entry, id: existing >= 0 ? store.entries[existing].id : generateId() };
  if (existing >= 0) {
    store.entries[existing] = newEntry;
  } else {
    store.entries.push(newEntry);
  }
  save(store);
  return newEntry;
}

export function deleteEntry(id: string) {
  const store = load();
  store.entries = store.entries.filter(e => e.id !== id);
  save(store);
}

export function getGoal(): Goal | null {
  return load().goal;
}

export function saveGoal(goal: Goal) {
  const store = load();
  store.goal = goal;
  save(store);
}

export function clearGoal() {
  const store = load();
  store.goal = null;
  save(store);
}

export function getLocalData(): { entries: WeightEntry[]; goal: Goal | null } {
  return load();
}

export function exportCSV(entries: WeightEntry[], unit: Unit): string {
  const rows = ['Weight Date,Weight Measurement,Weight Unit,Note'];
  for (const e of entries) {
    const weight = toDisplay(e.weight, unit);
    const dateIso = `${e.date}T12:00:00.000Z`;
    const note = e.note ? `"${e.note.replace(/"/g, '""')}"` : '';
    rows.push([dateIso, weight, unit, note].join(','));
  }
  return rows.join('\n');
}
