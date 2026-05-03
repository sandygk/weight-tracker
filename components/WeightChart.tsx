'use client';

import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { WeightEntry, Goal } from '@/types';
import { goalEndDate, expectedWeightOnDate } from '@/lib/goalCalculator';
import { Unit, toDisplay } from '@/lib/units';

interface ChartPoint {
  date: string;
  ts: number;       // Unix ms — used for proportional x-axis positioning
  label: string;
  weight?: number;
  goalWeight?: number;
  note?: string;
}

interface ColorRun {
  data: { ts: number; label: string; w: number | null }[];
  stroke: string;
}

const STROKE: Record<string, string> = {
  green: '#22c55e',
  orange: '#f97316',
  red: '#ef4444',
  default: '#3b82f6',
};

function segColor(p: ChartPoint, goal: Goal | null, unit: Unit): string {
  if (!goal || p.weight == null) return 'default';
  const exp = expectedWeightOnDate(goal, p.date);
  if (exp == null) return 'default';
  const diff = p.weight - toDisplay(exp, unit);
  if (diff <= 0) return 'green';
  if (diff <= 1) return 'orange';
  return 'red';
}

/**
 * Builds full-length sparse arrays for each color run so recharts positions
 * each run by its correct data index (not label value). Adjacent runs share
 * their boundary point so transitions connect without gaps.
 *
 * A segment Pi→Pi+1 takes the color of Pi+1 (destination color).
 */
function buildColorRuns(mainData: ChartPoint[], goal: Goal | null, unit: Unit): ColorRun[] {
  const wPts = mainData.filter(p => p.weight != null);
  if (wPts.length < 2) return [];

  // Map each weight point to its index in mainData
  const dateIdx = new Map(mainData.map((p, i) => [p.date, i]));

  // Identify run boundaries (segment Si color = color of wPts[i+1])
  type RawRun = { start: number; end: number; color: string }; // indices into wPts
  const rawRuns: RawRun[] = [];
  let runStart = 0;
  let runColor = segColor(wPts[1], goal, unit);

  for (let i = 1; i < wPts.length - 1; i++) {
    const next = segColor(wPts[i + 1], goal, unit);
    if (next !== runColor) {
      rawRuns.push({ start: runStart, end: i, color: runColor });
      runStart = i;       // boundary point is shared with next run
      runColor = next;
    }
  }
  rawRuns.push({ start: runStart, end: wPts.length - 1, color: runColor });

  // Build full-length sparse arrays
  return rawRuns.map(({ start, end, color }) => {
    const data = mainData.map(p => ({ ts: p.ts, label: p.label, w: null as number | null }));
    for (let wi = start; wi <= end; wi++) {
      const p = wPts[wi];
      const idx = dateIdx.get(p.date);
      if (idx != null) data[idx] = { ts: p.ts, label: p.label, w: p.weight! };
    }
    return { data, stroke: STROKE[color] ?? '#3b82f6' };
  });
}

/** Returns a full-length sparse array with `gw` set only at the first and last
 *  goal-line data points — guarantees a single straight segment regardless of
 *  how many intermediate entries exist. */
function buildGoalAnchors(mainData: ChartPoint[]): { ts: number; label: string; gw: number | null }[] {
  const indexed = mainData
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.goalWeight != null);
  if (indexed.length < 2) return [];
  const first = indexed[0];
  const last = indexed[indexed.length - 1];
  return mainData.map((p, i) => ({
    ts: p.ts,
    label: p.label,
    gw: (i === first.i || i === last.i) ? p.goalWeight! : null,
  }));
}

function buildData(entries: WeightEntry[], goal: Goal | null, extendGoalLine: boolean, unit: Unit): ChartPoint[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const todayStr = new Date().toISOString().split('T')[0];
  const goalEnd = goal ? goalEndDate(goal) : null;
  const map = new Map<string, ChartPoint>();

  const ts = (d: string) => new Date(d + 'T12:00:00').getTime();

  for (const e of sorted) {
    const exp = goal ? expectedWeightOnDate(goal, e.date) : null;
    map.set(e.date, {
      date: e.date, ts: ts(e.date), label: fmt(e.date),
      weight: toDisplay(e.weight, unit),
      goalWeight: exp != null ? toDisplay(exp, unit) : undefined,
      note: e.note,
    });
  }

  if (goal && goalEnd) {
    if (extendGoalLine && goalEnd > todayStr && !map.has(goalEnd))
      map.set(goalEnd, { date: goalEnd, ts: ts(goalEnd), label: fmt(goalEnd), goalWeight: toDisplay(goal.goalWeight, unit) });
    if (todayStr > goalEnd) {
      const flat = toDisplay(goal.goalWeight, unit);
      const ex = map.get(todayStr);
      if (ex) ex.goalWeight = flat;
      else map.set(todayStr, { date: todayStr, ts: ts(todayStr), label: fmt(todayStr), goalWeight: flat });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function fmt(d: string): string {
  const [, m, day] = d.split('-');
  return `${parseInt(m)}/${parseInt(day)}`;
}

interface Props {
  entries: WeightEntry[];
  goal: Goal | null;
  unit: Unit;
  extendGoalLine?: boolean;
  onDotClick?: (entry: WeightEntry) => void;
}

export default function WeightChart({ entries, goal, unit, extendGoalLine = false, onDotClick }: Props) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 gap-3 text-gray-300">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        <p className="text-sm">No data for this range</p>
      </div>
    );
  }

  const entryByDate = new Map(entries.map(e => [e.date, e]));

  const data = buildData(entries, goal, extendGoalLine, unit);
  const colorRuns = buildColorRuns(data, goal, unit);
  const goalAnchors = goal ? buildGoalAnchors(data) : null;

  const displayWeights = entries.map(e => toDisplay(e.weight, unit));
  const yMin = Math.floor(Math.min(...displayWeights) - 1);
  const yMax = Math.ceil(Math.max(...displayWeights) + 1);

  const getDotColor = (payload: any): string => {
    if (!goal || !payload?.date || payload.weight == null) return '#3b82f6';
    const exp = expectedWeightOnDate(goal, payload.date);
    if (exp == null) return '#3b82f6';
    const diff = payload.weight - toDisplay(exp, unit);
    if (diff <= 0) return '#22c55e';
    if (diff <= 1) return '#f97316';
    return '#ef4444';
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload?.weight || cx == null || cy == null) return null;
    const color = getDotColor(payload);
    const entry = entryByDate.get(payload.date);
    return (
      <circle cx={cx} cy={cy} r={payload.note ? 4.5 : 3}
        fill={payload.note ? color : 'white'} stroke={color} strokeWidth={1.5}
        style={entry && onDotClick ? { cursor: 'pointer' } : undefined}
        onClick={entry && onDotClick ? () => onDotClick(entry) : undefined}
      />
    );
  };

  const ActiveDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    return <circle cx={cx} cy={cy} r={6} fill={getDotColor(payload)} stroke="white" strokeWidth={2} />;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const wp = payload.find((p: any) => p.dataKey === 'weight');
    const gp = payload.find((p: any) => p.dataKey === 'goalWeight');
    const anyPayload = payload[0]?.payload;
    const dateLabel = anyPayload?.label ?? fmt(new Date(label).toISOString().split('T')[0]);
    return (
      <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-md text-xs max-w-48">
        <p className="font-semibold text-gray-600 mb-1">{dateLabel}</p>
        {wp && <p className="text-blue-600">Weight: <strong>{wp.value} {unit}</strong></p>}
        {gp && <p className="text-orange-500">Goal: <strong>{Number(gp.value).toFixed(1)} {unit}</strong></p>}
        {wp?.payload?.note && <p className="text-gray-500 mt-1">{wp.payload.note}</p>}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          type="number" dataKey="ts" scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={data.map(p => p.ts)}
          interval="preserveStartEnd"
          tickFormatter={(ts: number) => fmt(new Date(ts).toISOString().split('T')[0])}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false} tickLine={false}
        />
        <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />

        {/* Visual goal line: exactly 2 anchor points → single straight segment */}
        {goal && goalAnchors && goalAnchors.length > 0 && (
          <Line data={goalAnchors} type="linear" dataKey="gw"
            stroke="#f97316" strokeWidth={1.5} strokeDasharray="5 5"
            dot={false} activeDot={false} connectNulls
            isAnimationActive={false} legendType="none" />
        )}
        {/* Invisible: carries goalWeight into tooltip payload */}
        {goal && (
          <Line type="linear" dataKey="goalWeight" stroke="none" strokeWidth={0}
            dot={false} activeDot={false} connectNulls
            animationDuration={0} legendType="none" />
        )}

        {/* Each color run as its own Line with a full-length sparse data array */}
        {colorRuns.map((run, i) => (
          <Line key={i} data={run.data} type="monotone" dataKey="w"
            stroke={run.stroke} strokeWidth={2} dot={false} activeDot={false}
            connectNulls={false} isAnimationActive={false} legendType="none" />
        ))}

        {/* Invisible line — carries dots and tooltip, uses main data */}
        <Line type="monotone" dataKey="weight" stroke="none" strokeWidth={0}
          dot={<CustomDot />} activeDot={<ActiveDot />}
          connectNulls animationDuration={300} legendType="none" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
