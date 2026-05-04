import { WeightEntry, Goal } from '@/types';

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

export function upsertEntry(entry: Omit<WeightEntry, 'id'> & { id?: string }): WeightEntry {
  const store = load();
  const existing = store.entries.findIndex(e => e.date === entry.date);
  const id = entry.id ?? (existing >= 0 ? store.entries[existing].id : generateId());
  const newEntry: WeightEntry = { ...entry, id };
  if (existing >= 0) {
    store.entries[existing] = newEntry;
  } else {
    store.entries.push(newEntry);
  }
  save(store);
  return newEntry;
}

export function replaceAll(entries: WeightEntry[], goal: Goal | null) {
  save({ entries, goal });
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

export function exportJSON(entries: WeightEntry[], goal: Goal | null): string {
  return JSON.stringify({ version: 1, entries, goal }, null, 2);
}
