export type Unit = 'lb' | 'kg';

const UNIT_KEY = 'wt-unit';

export function getUnit(): Unit {
  if (typeof window === 'undefined') return 'lb';
  return (localStorage.getItem(UNIT_KEY) as Unit) ?? 'lb';
}

export function saveUnit(unit: Unit) {
  localStorage.setItem(UNIT_KEY, unit);
}

/** Convert a stored-lb value to display unit */
export function toDisplay(lbs: number, unit: Unit): number {
  if (unit === 'kg') return Math.round((lbs / 2.20462) * 10) / 10;
  return lbs;
}

/** Convert a display-unit value back to stored lb */
export function toStorage(value: number, unit: Unit): number {
  if (unit === 'kg') return Math.round(value * 2.20462 * 10) / 10;
  return value;
}
