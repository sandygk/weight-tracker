// Parses WeightFit CSV exports:
// "Weight Date,Weight Measurement,Weight Unit"
// "2026-05-01T13:04:00.099Z,185.6,lb"
export function parseWeightFitCSV(text: string): { date: string; weight: number }[] {
  const lines = text.trim().split('\n');
  const entries: { date: string; weight: number }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 2) continue;

    const rawDate = parts[0].trim().replace(/^"|"$/g, '');
    const rawWeight = parts[1].trim().replace(/^"|"$/g, '');
    const unit = parts[2]?.trim().replace(/^"|"$/g, '').toLowerCase() ?? 'lb';

    const date = rawDate.split('T')[0];
    let weight = parseFloat(rawWeight);
    if (isNaN(weight) || !date.match(/^\d{4}-\d{2}-\d{2}$/)) continue;

    if (unit === 'kg') weight = Math.round(weight * 2.20462 * 10) / 10;

    entries.push({ date, weight });
  }

  return entries;
}
