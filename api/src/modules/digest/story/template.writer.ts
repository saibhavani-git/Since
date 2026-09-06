import { pct, pctAbs, rupees } from "../../../lib/format.js";
import { labelInstant } from "../../../lib/ist.js";
import type { EvidenceItem } from "../../../providers/news/index.js";
import { dedupePoints, newestFirst, pointFromEvidence, pricePoints } from "./points.js";
import type { ReportBody, Story, StoryFacts, StoryWriter } from "./ports.js";
import type { StoryPoint } from "../../../contracts/index.js";

/** The three most important non-price points — what a person should hear about. */
export const topNews = (points: StoryPoint[], n = 3): StoryPoint[] =>
  points
    .filter((p) => p.kind !== "price")
    .sort((a, b) => b.weight - a.weight || b.at.localeCompare(a.at))
    .slice(0, n);

/** How many press/filing points a card carries at most. */
export const MAX_POINTS = 8;

/**
 * Deterministic prose from facts. The baseline every deployment has, and the
 * fallback when a model is unavailable or fails the grounding check.
 */
export class TemplateStoryWriter implements StoryWriter {
  readonly name = "template";

  /**
   * Only salient evidence is allowed to sound like a cause. A routine filing
   * in the window is mentioned as "the only thing on record", never as "why".
   */
  async why(f: StoryFacts): Promise<string | null> {
    const top = f.evidence[0];
    const t = en;
    if (top && top.salience >= 0.7) return t.why(top, f.evidence.length, f.now);
    return this.noClearCause(f);
  }

  /**
   * The honest paragraph when nothing explains the move. Still informative:
   * it says what the numbers do tell us — how unusual, on what volume, what
   * levels it crossed, what is coming — and, if there is a non-routine filing,
   * names it without pretending it is the cause.
   */
  noClearCause(f: StoryFacts): string {
    const t = en;
    const top = f.evidence[0];
    const parts: string[] = [t.noCause];
    const facts = t.factsLine(f);
    if (facts) parts.push(facts);
    if (top && top.salience >= 0.5) parts.push(t.onRecord(top, f.now));
    if (f.events.nextResultsAt && f.events.nextResultsAt > f.now) parts.push(t.results(f.events.nextResultsAt, f.now));
    return parts.join(" ");
  }

  /**
   * Without a model: the substantive evidence, cleaned and deduplicated,
   * plus what the price did. The engine's headline stays.
   */
  async story(f: StoryFacts): Promise<Story> {
    const press = f.evidence
      .filter((e) => e.salience >= 0.45)
      .sort((a, b) => b.salience - a.salience || b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, MAX_POINTS)
      .map((e) => pointFromEvidence(f, e));
    const points = newestFirst(dedupePoints([...press, ...pricePoints(f)]));
    return { lead: null, points, summary: this.summary(f, points), narration: this.narration(f, points) };
  }

  /** What is on the card: company developments first; price is supporting context. */
  summary(f: StoryFacts, points: StoryPoint[]): string {
    const t = en;
    const news = topNews(points);
    const parts = news.length
      ? [t.keyChanges(news.map((p) => p.title)), t.priceLine(f), t.factsLine(f)]
      : [t.priceLine(f), t.noCause, t.factsLine(f)];
    if (f.events.nextResultsAt && f.events.nextResultsAt > f.now) parts.push(t.results(f.events.nextResultsAt, f.now));
    return parts.filter(Boolean).join(" ");
  }

  /** The same, as a presenter reads it: news first, market numbers second. */
  narration(f: StoryFacts, points: StoryPoint[]): string {
    const t = en;
    const news = topNews(points);
    const parts = news.length
      ? [t.spokenChanges(news.map((p) => ({ title: p.title, source: p.source }))), t.spokenOpen(f), t.factsLine(f)]
      : [t.spokenOpen(f), t.noCause, t.factsLine(f)];
    if (f.events.nextResultsAt && f.events.nextResultsAt > f.now) parts.push(t.results(f.events.nextResultsAt, f.now));
    return parts.filter(Boolean).join(" ");
  }

  async report(f: StoryFacts): Promise<ReportBody> {
    const t = en;
    const sections: ReportBody["sections"] = [];

    sections.push({
      title: t.whatHappened,
      body: `${f.headline} ${t.decomposition(f.move.indexPct, f.move.beta, f.move.stockPct)}`,
    });

    sections.push({
      title: t.why_,
      body: f.evidence.length ? f.evidence.slice(0, 5).map((e) => t.evidenceLine(e, f.now)).join("\n") : t.noEvidence,
    });

    const watch: string[] = [];
    if (f.events.nextResultsAt) watch.push(t.results(f.events.nextResultsAt, f.now));
    if (f.events.exDividendAt && f.events.exDividendAt > f.now) watch.push(t.exDiv(f.events.exDividendAt, f.now));
    for (const s of f.signals.filter((s) => s.tier === 1)) watch.push(s.summary);
    if (watch.length) sections.push({ title: t.watch, body: watch.join("\n") });

    return { headline: f.headline, why: await this.why(f), sections, writer: "template" };
  }
}

interface Strings {
  whatHappened: string;
  why_: string;
  watch: string;
  noEvidence: string;
  /** "No filing or news in this window explains it." */
  noCause: string;
  why(e: EvidenceItem, total: number, now: Date): string;
  /** What the numbers say when nothing else does. Empty string when there is nothing notable. */
  factsLine(f: StoryFacts): string;
  /** A non-routine filing named as context, not cause. */
  onRecord(e: EvidenceItem, now: Date): string;
  /** "Reliance is up 2.7% since 28 Aug, from ₹1,287 to ₹1,322." */
  priceLine(f: StoryFacts): string;
  /** "Key changes: A; B; C." */
  keyChanges(titles: string[]): string;
  /** Presenter's opening line. */
  spokenOpen(f: StoryFacts): string;
  /** Presenter's list of what happened, naming who reported it. */
  spokenChanges(items: { title: string; source: string }[]): string;
  decomposition(indexPct: number, beta: number, stockPct: number): string;
  evidenceLine(e: EvidenceItem, now: Date): string;
  results(d: Date, now: Date): string;
  exDiv(d: Date, now: Date): string;
}

const en: Strings = {
  whatHappened: "What happened",
  why_: "Why",
  watch: "What to watch",
  noEvidence: "No filing or news in this window explains the move. It may simply be the market, or positioning ahead of an event.",
  why: (e, total, now) =>
    e.kind === "filing"
      ? `The company filed “${e.title}” with the exchange on ${labelInstant(e.publishedAt, now)}.${total > 1 ? ` ${total - 1} more item${total > 2 ? "s" : ""} below.` : ""}`
      : `${e.source} reported: “${e.title}” (${labelInstant(e.publishedAt, now)}).`,
  noCause: "No filing or news in this window explains it.",
  factsLine: (f) => {
    const bits: string[] = [];
    if (Math.abs(f.moveInSigmas) >= 1.5) bits.push(`${Math.abs(f.moveInSigmas).toFixed(1)}× its usual move`);
    if (f.volumeRatio != null && f.volumeRatio >= 1.3) bits.push(`${f.volumeRatio.toFixed(1)}× normal volume`);
    const marketShare = Math.abs(f.move.totalPct) >= 0.5 ? Math.abs(f.move.marketPct) / Math.abs(f.move.totalPct) : 0;
    const market = marketShare >= 0.6 ? `mostly the market — Nifty went ${pct(f.move.indexPct)}` : Math.abs(f.move.indexPct) < 0.5 ? "on a flat market" : `against Nifty’s ${pct(f.move.indexPct)}`;
    if (bits.length === 0) return `The move is ${market}.`;
    return `It came on ${bits.join(" and ")}, ${market}.`;
  },
  onRecord: (e, now) => `The only thing on record is ${e.kind === "filing" ? "a filing" : `a ${e.source} report`}: “${short(e.title)}” (${labelInstant(e.publishedAt, now)}).`,
  priceLine: (f) => `${f.name} is ${dir(f.move.totalPct, "up", "down", "flat")} ${pctAbs(f.move.totalPct)} since ${labelInstant(f.since, f.now).replace(/,.*$/, "")}, from ${rupees(f.priceThen)} to ${rupees(f.priceNow)}.`,
  keyChanges: (titles) => `${titles.length === 1 ? "The key change" : "Key changes"}: ${titles.map((t) => t.replace(/[.]$/, "")).join("; ")}.`,
  spokenOpen: (f) => `Since ${labelInstant(f.since, f.now).replace(/,.*$/, "")}, ${f.name} is ${dir(f.move.totalPct, "up", "down", "flat")} ${pctAbs(f.move.totalPct)}, from ${rupees(f.priceThen)} to ${rupees(f.priceNow)}.`,
  spokenChanges: (items) =>
    items.length === 1
      ? `One thing stood out. ${items[0]!.source} reported: ${items[0]!.title}.`
      : `${["Two", "Three", "Four"][items.length - 2] ?? items.length} things stood out. ${items.map((i, n) => `${["First", "Second", "Third", "Fourth"][n]}, ${i.source} reported: ${i.title}.`).join(" ")}`,
  decomposition: (i, b, s) => `Nifty moved ${pct(i)} over the same period; with a β of ${b.toFixed(2)}, about ${pctAbs(s)} of the move is specific to the stock.`,
  evidenceLine: (e, now) => `• ${labelInstant(e.publishedAt, now)} — ${e.kind === "filing" ? "Filing" : e.source}: ${e.title}`,
  results: (d, now) => `Results are due ${labelInstant(d, now)}.`,
  exDiv: (d, now) => `Goes ex‑dividend ${labelInstant(d, now)}.`,
};

const dir = (n: number, up: string, down: string, flat: string): string => (n > 0.05 ? up : n < -0.05 ? down : flat);

/** Filing titles run long; the card wants the gist. Cuts at a word boundary. */
const short = (title: string, max = 90): string => (title.length <= max ? title : `${title.slice(0, max).replace(/\s+\S*$/, "")}…`);

export const numbersFor = (f: StoryFacts): { label: string; value: string }[] => {
  const L = NUM;
  const out = [
    { label: L.then, value: rupees(f.priceThen) },
    { label: L.now, value: rupees(f.priceNow) },
    { label: L.change, value: pct(f.move.totalPct) },
    { label: L.market, value: pct(f.move.marketPct) },
    { label: L.stock, value: pct(f.move.stockPct) },
    { label: L.beta, value: f.move.beta.toFixed(2) },
    { label: L.sigma, value: `${f.moveInSigmas.toFixed(1)}σ` },
  ];
  if (f.volumeRatio != null) out.push({ label: L.volume, value: `${f.volumeRatio.toFixed(1)}×` });
  return out;
};
const NUM = { then: "Then", now: "Now", change: "Change", market: "Market part", stock: "Stock part", beta: "Beta", sigma: "Unusualness", volume: "Volume vs usual" };
