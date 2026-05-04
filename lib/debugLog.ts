const KEY = 'wt-debug-log';
const MAX = 30;

export function dlog(msg: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    const ts = new Date().toISOString().slice(11, 23);
    existing.push(`${ts} ${msg}`);
    localStorage.setItem(KEY, JSON.stringify(existing.slice(-MAX)));
  } catch {}
}

export function getLogs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function clearLogs() {
  localStorage.removeItem(KEY);
}
