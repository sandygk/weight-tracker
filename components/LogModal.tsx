'use client';

import { useState, useRef } from 'react';
import { upsertEntry } from '@/lib/data';
import { WeightEntry } from '@/types';
import { Unit, toDisplay, toStorage } from '@/lib/units';
import { localDateStr } from '@/lib/date';

interface Props {
  uid: string | null;
  entries: WeightEntry[];
  unit: Unit;
  onSave: () => void;
  onClose: () => void;
}

function today(): string {
  return localDateStr();
}

function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${month}/${day}/${String(year).slice(2)}`;
}

interface DrumColProps {
  value: number;
  min: number;
  max: number;
  wrap?: boolean;
  onChange: (v: number) => void;
}

const ROW_H = 56;

function DrumCol({ value, min, max, wrap = false, onChange }: DrumColProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [visualOffset, setVisualOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const startVal = useRef(value);
  const hasMoved = useRef(false);

  function clampVal(v: number) {
    if (wrap) {
      const range = max - min + 1;
      return ((v - min) % range + range) % range + min;
    }
    return Math.max(min, Math.min(max, v));
  }

  function processDrag(currentY: number) {
    if (startY.current === null) return;
    const dy = startY.current - currentY;
    if (Math.abs(dy) > 4) hasMoved.current = true;
    const steps = Math.sign(dy) * Math.floor(Math.abs(dy) / ROW_H);
    setVisualOffset(-(dy % ROW_H));
    onChange(clampVal(startVal.current + steps));
  }

  function endDrag(finalClientY?: number) {
    if (!hasMoved.current && finalClientY !== undefined && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relY = finalClientY - rect.top;
      if (relY < ROW_H) onChange(clampVal(value - 1));
      else if (relY > ROW_H * 2) onChange(clampVal(value + 1));
    }
    setVisualOffset(0);
    setIsDragging(false);
    startY.current = null;
    hasMoved.current = false;
  }

  function handleTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
    startVal.current = value;
    hasMoved.current = false;
    setIsDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    processDrag(e.touches[0].clientY);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    endDrag(e.changedTouches[0].clientY);
  }

  function handleMouseDown(e: React.MouseEvent) {
    startY.current = e.clientY;
    startVal.current = value;
    hasMoved.current = false;
    setIsDragging(true);
    e.preventDefault();

    const onMove = (ev: MouseEvent) => processDrag(ev.clientY);
    const onUp = (ev: MouseEvent) => {
      endDrag(ev.clientY);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const innerTranslateY = -ROW_H + visualOffset;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden cursor-ns-resize"
      style={{ width: 72, height: ROW_H * 3, touchAction: 'none', userSelect: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      <div
        className="absolute inset-x-0 border-t border-b border-gray-200 dark:border-gray-600 pointer-events-none"
        style={{ top: ROW_H, height: ROW_H }}
      />
      <div
        style={{
          transform: `translateY(${innerTranslateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.12s ease-out',
          willChange: 'transform',
        }}
      >
        {[-2, -1, 0, 1, 2].map(delta => {
          const v = clampVal(value + delta);
          const inRange = wrap || (value + delta >= min && value + delta <= max);
          return (
            <div
              key={delta}
              className={`flex items-center justify-center ${
                delta === 0
                  ? 'text-3xl font-bold text-gray-900 dark:text-gray-100'
                  : 'text-2xl font-light text-gray-300 dark:text-gray-600'
              } ${!inRange ? 'invisible' : ''}`}
              style={{ height: ROW_H }}
            >
              {v}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LogModal({ uid, entries, unit, onSave, onClose }: Props) {
  const todayStr = today();
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const lastWeightLb = sorted.length > 0 ? sorted[sorted.length - 1].weight : 150.0;
  const lastWeight = toDisplay(lastWeightLb, unit);

  const existingEntry = entries.find(e => e.date === todayStr);
  const [whole, setWhole] = useState(Math.floor(lastWeight));
  const [decimal, setDecimal] = useState(Math.round((lastWeight - Math.floor(lastWeight)) * 10));
  const [note, setNote] = useState(existingEntry?.note ?? '');

  const wholeMin = unit === 'kg' ? 20 : 50;
  const wholeMax = unit === 'kg' ? 350 : 700;

  async function handleOk() {
    const displayWeight = Math.round((whole + decimal / 10) * 10) / 10;
    const weight = toStorage(displayWeight, unit);
    await upsertEntry(uid, { date: todayStr, weight, note: note.trim() || undefined });
    onSave();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      onTouchEnd={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xs shadow-2xl">
        <div className="px-6 pt-6 pb-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Weight</h2>
        </div>

        <div className="px-4 py-4 flex items-center justify-center gap-1">
          <DrumCol value={whole} min={wholeMin} max={wholeMax} onChange={setWhole} />
          <span className="text-3xl font-bold text-gray-400 dark:text-gray-500 self-center mx-1" style={{ marginTop: 2 }}>.</span>
          <DrumCol value={decimal} min={0} max={9} wrap onChange={setDecimal} />
          <span className="text-lg font-medium text-gray-400 dark:text-gray-500 self-center ml-2">{unit}</span>
        </div>

        <div className="px-5 pb-3">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            maxLength={120}
            className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="flex items-center px-5 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-sm text-gray-400 dark:text-gray-500 font-medium flex-1">
            {formatDateShort(todayStr)}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ touchAction: 'manipulation' }}
            className="px-3 py-2 text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOk}
            style={{ touchAction: 'manipulation' }}
            className="px-3 py-2 text-sm font-semibold text-blue-600 uppercase tracking-wider"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
