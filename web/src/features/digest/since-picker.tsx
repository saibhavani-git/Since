"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";

export type SincePreset = "checkpoint" | "1d" | "3d" | "1w" | "1m";

/** What the user asked to compare against: a named preset or an exact day. */
export type SinceSelection = { kind: "preset"; preset: SincePreset } | { kind: "date"; date: string /* YYYY-MM-DD */ };

const presets: { value: SincePreset; label: string; fullLabel: string }[] = [
  { value: "checkpoint", label: "Last looked", fullLabel: "Since I last looked" },
  { value: "1d", label: "Yesterday", fullLabel: "Since yesterday" },
  { value: "3d", label: "3 days", fullLabel: "Since 3 days ago" },
  { value: "1w", label: "Last week", fullLabel: "Since last week" },
  { value: "1m", label: "Last month", fullLabel: "Since last month" },
];

const DAY = 86_400_000;
/** Custom dates reach back this far; beyond it evidence thins and the story weakens. */
const MAX_LOOKBACK_DAYS = 92;

export function sinceLabel(sel: SinceSelection): string {
  if (sel.kind === "date") return `Since ${prettyDay(sel.date)}`;
  return presets.find((p) => p.value === sel.preset)?.fullLabel ?? "Since I last looked";
}

/**
 * ISO instant for a selection, or undefined for the saved checkpoint. Always
 * pinned to 3:30 pm IST — the close — and stable per calendar day so caches hit.
 */
export function selectionToSince(sel: SinceSelection, now = new Date()): string | undefined {
  if (sel.kind === "date") {
    const [y, m, d] = sel.date.split("-").map(Number) as [number, number, number];
    return new Date(Date.UTC(y, m - 1, d, 10, 0, 0)).toISOString();
  }
  if (sel.preset === "checkpoint") return undefined;
  const days = { "1d": 1, "3d": 3, "1w": 7, "1m": 30 }[sel.preset];
  const at = new Date(now.getTime() - days * DAY);
  at.setUTCHours(10, 0, 0, 0);
  return at.toISOString();
}

export function SincePicker({ value, onChange, className }: { value: SinceSelection; onChange: (s: SinceSelection) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Dismiss on outside press or Escape, like every other popover in the app.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pickDate = (date: string) => {
    onChange({ kind: "date", date });
    setOpen(false);
  };

  return (
    <div ref={ref} className={cx("relative", className)}>
      <div className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="group" aria-label="Look back from" className="flex w-max items-center rounded-full border border-line-2 bg-surface p-1">
          <span className="pl-3 pr-2 text-[12px] font-medium text-text-3" aria-hidden>
            Since
          </span>
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                setOpen(false);
                onChange({ kind: "preset", preset: preset.value });
              }}
              aria-pressed={value.kind === "preset" && value.preset === preset.value}
              aria-label={preset.fullLabel}
              className={cx(
                "h-9 rounded-full px-3 text-[12.5px] font-medium whitespace-nowrap transition-colors",
                value.kind === "preset" && value.preset === preset.value ? "bg-ink text-white" : "text-text-2 hover:bg-canvas-2 hover:text-text",
              )}
            >
              {preset.label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-line" aria-hidden />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label="Pick a date to compare against"
            className={cx(
              "flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium whitespace-nowrap transition-colors num",
              value.kind === "date" ? "bg-ink text-white" : "text-text-2 hover:bg-canvas-2 hover:text-text",
            )}
          >
            <CalendarGlyph />
            {value.kind === "date" ? prettyDay(value.date) : "A date"}
          </button>
        </div>
      </div>

      {/* Enter animated, close instant: an exit animation can be stranded when
          picking a date remounts the deck in the same commit. */}
      {open ? (
        <motion.div
          role="dialog"
          aria-label="Pick a date"
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="absolute right-0 top-[calc(100%+10px)] z-30 w-[296px] rounded-[22px] border border-line bg-surface p-4 shadow-card"
        >
          <Calendar selected={value.kind === "date" ? value.date : null} onPick={pickDate} />
        </motion.div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Calendar                                                                    */
/* -------------------------------------------------------------------------- */

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * A small month view, ours end to end: yesterday back to three months ago is
 * selectable, everything else is quietly disabled.
 */
function Calendar({ selected, onPick }: { selected: string | null; onPick: (date: string) => void }) {
  const today = startOfDay(new Date());
  const max = new Date(today.getTime() - DAY); // yesterday — "since today" is nothing yet
  const min = new Date(today.getTime() - MAX_LOOKBACK_DAYS * DAY);
  const [view, setView] = useState(() => {
    const base = selected ? parseDay(selected) : max;
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const first = new Date(view.year, view.month, 1);
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const leadingBlanks = (first.getDay() + 6) % 7; // weeks start Monday
  const canPrev = new Date(view.year, view.month, 1) > new Date(min.getFullYear(), min.getMonth(), 1);
  const canNext = new Date(view.year, view.month + 1, 1) <= max;

  const move = (delta: number) => setView((v) => ({ year: new Date(v.year, v.month + delta, 1).getFullYear(), month: new Date(v.year, v.month + delta, 1).getMonth() }));

  return (
    <div>
      <div className="flex items-center justify-between px-1">
        <p className="text-[13.5px] font-medium num">
          {MONTHS[view.month]} {view.year}
        </p>
        <div className="flex gap-1">
          <NavButton dir="prev" disabled={!canPrev} onClick={() => move(-1)} />
          <NavButton dir="next" disabled={!canNext} onClick={() => move(1)} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-0.5 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="pb-1 text-[10px] font-bold uppercase tracking-[0.07em] text-text-3">
            {w}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = new Date(view.year, view.month, i + 1);
          const iso = fmtDay(date);
          const eligible = date >= min && date <= max;
          const isSelected = iso === selected;
          return (
            <button
              key={iso}
              type="button"
              disabled={!eligible}
              onClick={() => onPick(iso)}
              aria-pressed={isSelected}
              className={cx(
                "mx-auto flex size-9 items-center justify-center rounded-full text-[13px] num transition-colors",
                isSelected ? "bg-ink font-medium text-white" : eligible ? "text-text hover:bg-canvas-2" : "cursor-default text-text-3/40",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <p className="mt-3 border-t border-line px-1 pt-3 text-[11.5px] leading-snug text-text-3">Any day in the last three months. The catch-up reads from that day&rsquo;s close.</p>
    </div>
  );
}

function NavButton({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous month" : "Next month"}
      className={cx("flex size-8 items-center justify-center rounded-full transition-colors", disabled ? "text-text-3/30" : "text-text-2 hover:bg-canvas-2 hover:text-text")}
    >
      <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden>
        <path d={dir === "prev" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </button>
  );
}

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden>
      <rect x="2" y="3" width="12" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Day helpers (local time; the audience is IST)                               */
/* -------------------------------------------------------------------------- */

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parseDay = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};
const fmtDay = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const prettyDay = (iso: string): string => parseDay(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
