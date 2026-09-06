import type { StoryPoint, StoryTone } from "../../../contracts/index.js";
import { pct, rupees } from "../../../lib/format.js";
import { istDayKey } from "../../../lib/ist.js";
import type { EvidenceItem } from "../../../providers/news/index.js";
import { trusted } from "../../../providers/news/relevance.js";
import type { StoryFacts } from "./ports.js";

/** The deterministic half of a story: what the price did, and where each point sits on the chart. */

const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

/** Close on the IST day of `at` (or the last close before it) and that day's change. */
export function priceOn(f: StoryFacts, at: Date): { price: number | null; dayChangePct: number | null } {
  const key = istDayKey(at);
  let idx = -1;
  for (let i = 0; i < f.series.length; i++) {
    if (istDayKey(f.series[i]!.t) <= key) idx = i;
    else break;
  }
  if (idx < 0) return { price: null, dayChangePct: null };
  const p = f.series[idx]!;
  const prev = f.series[idx - 1];
  return { price: p.c, dayChangePct: prev ? Math.round(((p.c - prev.c) / prev.c) * 1000) / 10 : null };
}

export const toneOf = (sentiment: number | null, dayChangePct: number | null): StoryTone => {
  const s = sentiment ?? (dayChangePct == null ? 0 : dayChangePct / 3);
  return s > 0.15 ? "up" : s < -0.15 ? "down" : "neutral";
};

/** A headline as a line of our own: no publisher tail, no shouting, no trailing stop. */
export function cleanTitle(raw: string): string {
  let t = raw.replace(/\s+/g, " ").trim();
  t = t.replace(/\s+[-|–—]\s+[A-Z][\w.&' ]{2,40}$/, ""); // " - Publisher"
  t = t.replace(/[.:;,\s]+$/, "");
  if (t === t.toUpperCase() && t.length > 12) t = t.charAt(0) + t.slice(1).toLowerCase();
  return t;
}

/** Evidence → point. The writer may overwrite title/detail; the anchor facts come from here. */
export function pointFromEvidence(f: StoryFacts, e: EvidenceItem, override?: { title?: string; detail?: string | null; tone?: StoryTone; weight?: number }): StoryPoint {
  const { price, dayChangePct } = priceOn(f, e.publishedAt);
  return {
    id: e.id,
    kind: e.kind,
    at: e.publishedAt.toISOString(),
    title: override?.title ?? cleanTitle(e.title),
    detail: override?.detail === undefined ? (e.summary ? e.summary.slice(0, 280) : null) : override.detail,
    source: e.kind === "filing" ? "BSE filing" : e.source,
    sourceUrl: e.sourceUrl,
    url: e.url,
    price,
    dayChangePct,
    tone: override?.tone ?? toneOf(e.sentiment, dayChangePct),
    weight: override?.weight ?? e.salience,
  };
}

/**
 * What the price itself did, as points: the engine's dated signals (52‑week
 * high, your target) and the high and low closes of the stretch when they
 * are not simply the end points.
 */
export function pricePoints(f: StoryFacts): StoryPoint[] {
  const out: StoryPoint[] = [];
  for (const s of f.signals) {
    if (!s.at) continue;
    const at = new Date(s.at);
    const { price, dayChangePct } = priceOn(f, at);
    out.push({
      id: `price:${s.kind}:${s.at}`,
      kind: "price",
      at: s.at,
      title: s.summary,
      detail: null,
      source: L.price,
      sourceUrl: null,
      url: null,
      price,
      dayChangePct,
      tone: /high|target|breakout|above|upar|ऊपर|उच्च|लक्ष्य/i.test(s.kind + s.summary) ? "up" : /low|below|neeche|नीचे|निचला/i.test(s.kind + s.summary) ? "down" : "neutral",
      weight: s.tier === 1 ? 1 : 0.7,
    });
  }

  const gap = f.series.slice(f.sinceIndex + 1);
  if (gap.length >= 3) {
    const hi = gap.reduce((a, b) => (b.c > a.c ? b : a));
    const lo = gap.reduce((a, b) => (b.c < a.c ? b : a));
    const last = gap[gap.length - 1]!;
    const t = L;
    if (hi !== last && (hi.c - f.priceNow) / f.priceNow > 0.01 && !out.some((p) => istDayKey(new Date(p.at)) === istDayKey(hi.t) && p.tone === "up")) {
      out.push(milestone(f, hi.t, t.high(hi.c, dayMonth.format(hi.t), pct(((hi.c - f.priceNow) / f.priceNow) * 100)), "up"));
    }
    if (lo !== last && (f.priceNow - lo.c) / f.priceNow > 0.01 && !out.some((p) => istDayKey(new Date(p.at)) === istDayKey(lo.t) && p.tone === "down")) {
      out.push(milestone(f, lo.t, t.low(lo.c, dayMonth.format(lo.t), pct(((f.priceNow - lo.c) / lo.c) * 100)), "down"));
    }
  }
  return out;
}

function milestone(f: StoryFacts, at: Date, title: string, tone: StoryTone): StoryPoint {
  const { price, dayChangePct } = priceOn(f, at);
  return { id: `price:${tone}:${at.toISOString()}`, kind: "price", at: at.toISOString(), title, detail: null, source: L.price, sourceUrl: null, url: null, price, dayChangePct, tone, weight: 0.5 };
}

/** Among the evidence a point draws on, prefer a recognised publisher; otherwise the first. */
export function bestOf(evidence: EvidenceItem[], idx: number[]): EvidenceItem | undefined {
  const items = idx.map((i) => evidence[i]).filter((e): e is EvidenceItem => !!e);
  return items.find((e) => e.kind === "filing") ?? items.find((e) => trusted(e.source)) ?? items[0];
}

/** The model may echo evidence numbers; the card never shows them. */
export const unmarked = (s: string): string => s.replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g, "").replace(/\s{2,}/g, " ").trim();

/** Newest first; ties broken by weight. */
export const newestFirst = (points: StoryPoint[]): StoryPoint[] => [...points].sort((a, b) => b.at.localeCompare(a.at) || b.weight - a.weight);

/** Same story told twice by two papers collapses to one. */
export function dedupePoints(points: StoryPoint[]): StoryPoint[] {
  const seen = new Set<string>();
  return points.filter((p) => {
    const key = p.title.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g, " ").trim().slice(0, 56);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface PriceStrings {
  price: string;
  high(price: number, day: string, aboveNow: string): string;
  low(price: number, day: string, belowNow: string): string;
}

const L: PriceStrings = {
  price: "Price",
  high: (p, d, above) => `Touched ${rupees(p)} on ${d}, the high of the stretch — ${above} above where it is now`,
  low: (p, d, below) => `Fell to ${rupees(p)} on ${d}, the low of the stretch — it has since recovered ${below}`,
};
