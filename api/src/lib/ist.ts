/**
 * Everything the user reads is in Indian Standard Time. IST has no DST, so a
 * fixed +05:30 offset is exact and lets us do calendar math without a
 * timezone library.
 */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export const IST = "Asia/Kolkata";

/** Calendar parts of an instant, as seen in IST. */
export function istParts(d: Date): { y: number; m: number; d: number; dow: number; minutes: number } {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    dow: shifted.getUTCDay(),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/** An instant for a given IST calendar date and time‑of‑day. */
export function istDate(y: number, m: number, d: number, minutes = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS + minutes * 60_000);
}

/** YYYY‑MM‑DD in IST. */
export function istDayKey(d: Date): string {
  const p = istParts(d);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export function startOfIstDay(d: Date): Date {
  const p = istParts(d);
  return istDate(p.y, p.m, p.d, 0);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: IST });
const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: IST });
const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: IST });

/**
 * Human label for an instant relative to now: "today, 3:40 pm", "Thursday,
 * 3:40 pm" (within a week), "12 Aug, 3:40 pm" otherwise.
 */
export function labelInstant(at: Date, now: Date): string {
  const days = Math.floor((startOfIstDay(now).getTime() - startOfIstDay(at).getTime()) / 86_400_000);
  const t = time.format(at).replace(/\s?(am|pm)/i, (m) => ` ${m.trim().toLowerCase()}`);
  if (days <= 0) return `today, ${t}`;
  if (days === 1) return `yesterday, ${t}`;
  if (days < 7) return `${weekday.format(at)}, ${t}`;
  return `${dayMonth.format(at)}, ${t}`;
}


