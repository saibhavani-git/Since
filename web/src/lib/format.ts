/**
 * Indian conventions, enforced once. ₹2,84,760 not ₹284,760; Thursday, 3:40 pm
 * not an ISO string. All times are rendered in IST regardless of the device.
 */
const IST = "Asia/Kolkata";

const inr0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const rupees = (n: number, opts: { decimals?: boolean } = {}): string =>
  `₹${(opts.decimals ?? Math.abs(n) < 1000 ? inr2 : inr0).format(n)}`;

export const pct = (n: number, digits = 1): string => {
  const v = n.toFixed(digits);
  return n > 0 ? `+${v}%` : n < 0 ? `−${Math.abs(n).toFixed(digits)}%` : `${v}%`;
};

export const signed = (n: number, digits = 2): string => (n > 0 ? `+${n.toFixed(digits)}` : n < 0 ? `−${Math.abs(n).toFixed(digits)}` : n.toFixed(digits));

export const compact = (n: number): string => {
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)} L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} K`;
  return inr0.format(n);
};

const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: IST });
const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: IST });
const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: IST });
const dayMonthYear = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: IST });

const istDayKey = (d: Date): string => new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(d);
const daysBetween = (a: Date, b: Date): number => Math.round((Date.parse(istDayKey(b)) - Date.parse(istDayKey(a))) / 86_400_000);

/** "today, 3:40 pm" · "yesterday, 3:40 pm" · "Thursday, 3:40 pm" · "28 Aug, 3:40 pm" */
export function whenLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const t = time.format(d).toLowerCase();
  const days = daysBetween(d, now);
  if (days <= 0) return `today, ${t}`;
  if (days === 1) return `yesterday, ${t}`;
  if (days < 7) return `${weekday.format(d)}, ${t}`;
  if (d.getFullYear() === now.getFullYear()) return `${dayMonth.format(d)}, ${t}`;
  return `${dayMonthYear.format(d)}, ${t}`;
}

/** "THU 3:40 PM" — for chart labels. */
export const shortStamp = (iso: string): string => {
  const d = new Date(iso);
  return `${new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: IST }).format(d)} ${time.format(d)}`.toUpperCase();
};

export const dateLabel = (iso: string): string => dayMonth.format(new Date(iso));

/** How long ago, coarse. For freshness pills. */
export function ago(iso: string, now = new Date()): string {
  const s = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return whenLabel(iso, now);
}

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
