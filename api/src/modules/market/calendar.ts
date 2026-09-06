import type { MarketPhase, MarketStatus } from "../../contracts/index.js";
import { addDays, istDate, istDayKey, istParts } from "../../lib/ist.js";

/**
 * NSE equity session calendar. Pure functions over IST; no I/O.
 *
 * Holidays are the exchange's published list. In production this would be
 * refreshed yearly from NSE; the functions don't change.
 */
export const OPEN_MINUTES = 9 * 60 + 15;
export const CLOSE_MINUTES = 15 * 60 + 30;

const HOLIDAYS_2026: Record<string, string> = {
  "2026-01-26": "Republic Day",
  "2026-03-03": "Holi",
  "2026-03-26": "Ram Navami",
  "2026-03-31": "Mahavir Jayanti",
  "2026-04-03": "Good Friday",
  "2026-04-14": "Dr. Ambedkar Jayanti",
  "2026-05-01": "Maharashtra Day",
  "2026-05-28": "Bakri Id",
  "2026-06-26": "Muharram",
  "2026-09-14": "Ganesh Chaturthi",
  "2026-10-02": "Gandhi Jayanti",
  "2026-10-20": "Dussehra",
  "2026-11-09": "Diwali Balipratipada",
  "2026-11-24": "Guru Nanak Jayanti",
  "2026-12-25": "Christmas",
};

export function holidayName(d: Date): string | null {
  return HOLIDAYS_2026[istDayKey(d)] ?? null;
}

export function isTradingDay(d: Date): boolean {
  const dow = istParts(d).dow;
  return dow !== 0 && dow !== 6 && holidayName(d) === null;
}

export function phaseAt(now: Date): MarketPhase {
  const p = istParts(now);
  if (p.dow === 0 || p.dow === 6) return "closed_weekend";
  if (holidayName(now)) return "closed_holiday";
  if (p.minutes < OPEN_MINUTES) return "pre_open";
  if (p.minutes < CLOSE_MINUTES) return "open";
  return "post_close";
}

/** Close (15:30 IST) of the most recent completed session strictly before `now`. */
export function lastCloseBefore(now: Date): Date {
  let d = now;
  for (let i = 0; i < 20; i++) {
    const p = istParts(d);
    const close = istDate(p.y, p.m, p.d, CLOSE_MINUTES);
    if (isTradingDay(d) && close < now) return close;
    d = addDays(startOfDay(d), -1);
  }
  return now;
}

/** Open (09:15 IST) of the next session at or after `now`. */
export function nextOpenAfter(now: Date): Date {
  let d = now;
  for (let i = 0; i < 20; i++) {
    const p = istParts(d);
    const open = istDate(p.y, p.m, p.d, OPEN_MINUTES);
    if (isTradingDay(d) && open > now) return open;
    d = addDays(startOfDay(d), 1);
  }
  return now;
}

/** Number of trading sessions that closed in (from, to]. */
export function sessionsBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let count = 0;
  let d = startOfDay(from);
  const end = startOfDay(to);
  while (d <= end) {
    if (isTradingDay(d)) {
      const p = istParts(d);
      const close = istDate(p.y, p.m, p.d, CLOSE_MINUTES);
      if (close > from && close <= to) count++;
    }
    d = addDays(d, 1);
  }
  return count;
}

export function statusAt(now: Date): MarketStatus {
  const phase = phaseAt(now);
  return {
    phase,
    at: now.toISOString(),
    nextOpenAt: phase === "open" ? null : nextOpenAfter(now).toISOString(),
    lastCloseAt: lastCloseBefore(now).toISOString(),
    holidayName: holidayName(now),
  };
}

function startOfDay(d: Date): Date {
  const p = istParts(d);
  return istDate(p.y, p.m, p.d, 0);
}
