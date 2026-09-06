import { pct } from "../../../lib/format.js";
import type { Logger } from "../../../lib/logger.js";
import type { LanguageModel } from "../../../providers/ai/index.js";
import { bestOf, dedupePoints, newestFirst, pointFromEvidence, pricePoints, unmarked } from "./points.js";
import type { ReportBody, Story, StoryFacts, StoryWriter } from "./ports.js";
import { MAX_POINTS, topNews, type TemplateStoryWriter } from "./template.writer.js";

/**
 * A language model writes from the facts we hand it — and only those.
 * Every output is checked: numbers must appear in the facts, citations must
 * point at listed sources. Anything that fails falls back to the template.
 */
export class ModelStoryWriter implements StoryWriter {
  readonly name: string;

  constructor(
    private readonly model: LanguageModel,
    private readonly fallback: TemplateStoryWriter,
    private readonly log: Logger,
  ) {
    this.name = `model:${model.name}`;
  }

  async why(f: StoryFacts): Promise<string | null> {
    if (f.evidence.length === 0) return this.fallback.why(f);
    try {
      const out = await this.model.complete({
        system: SYSTEM(),
        prompt: `${factsBlock(f)}\n\nTASK: In one or two sentences (max 45 words), explain WHY ${f.name} moved, using only the evidence. Lead with the cause, cite each claim's evidence number in square brackets, e.g. [1]. Ignore routine compliance filings (Regulation 30 intimations, shareholder mailers, trading-window notices) — they explain nothing. If no evidence genuinely explains the move, reply exactly: NONE`,
        maxTokens: 160,
        temperature: 0.2,
      });
      const text = out.trim();
      // The model judged that nothing explains the move: say so in words, never leave the card mute.
      if (text === "NONE" || !text) return this.fallback.noClearCause(f);
      const check = grounded(text, f);
      if (check.ok) return text;
      this.log.warn({ symbol: f.symbol, reason: check.reason, text }, "model why failed grounding; using template");
      return this.fallback.why(f);
    } catch (err) {
      this.log.warn({ err: String(err), symbol: f.symbol }, "model why failed; using template");
      return this.fallback.why(f);
    }
  }

  /**
   * The model reads every headline we found and writes the list a person
   * would want: duplicates merged, listicles and market wraps dropped, each
   * point one clean line with a sentence of detail, and a lead line that
   * says what happened and why. Every point is pinned to the evidence it
   * came from; anything with numbers we did not show it is dropped.
   */
  async story(f: StoryFacts): Promise<Story> {
    if (f.evidence.length === 0) return this.fallback.story(f);
    try {
      const out = await this.model.complete({
        system: SYSTEM(),
        prompt: `${factsBlock(f)}

TASK: Return JSON only: {"lead": string, "points": [{"i": number[], "title": string, "detail": string|null, "tone": "up"|"down"|"neutral", "weight": number}], "summary": string, "narration": string}.
- points: the distinct things that happened to ${f.name} in this window, most important first, at most ${MAX_POINTS}. Merge items that report the same event ("i" lists every evidence number it draws on). Skip listicles ("stocks to buy", "top 10"), market wraps, sector round-ups, social posts, and routine compliance filings (Regulation 30 intimations, trading-window notices, shareholder mailers).
- title: one line, at most 90 characters, plain and specific, written by you — not the headline copied. Past tense. No publisher names, no clickbait, no question marks, no [n] markers anywhere in the output.
- detail: one or two sentences of substance from the evidence, or null if the evidence is only a headline.
- tone: how the news reads for the stock.
- weight: 0–1, how much a shareholder should care. Results, deals, regulatory actions, leadership changes, ratings, large orders: 0.6–1. Broker targets, analyst views: 0.4–0.6. Consumer complaints, trivia, minor vendor orders, options data, promotions: 0–0.2.
- lead: one line, at most 110 characters, for the top of the card. Start with "${f.name}" and the most consequential company development. Mention the share move only when a source explicitly connects that development to the move. If there is no substantive evidence, fall back to the price and market. Never use arrows or the → symbol.
- summary: 2 to 4 short sentences for the card. Lead with what changed at the company, not the share price. Explain the two or three developments that matter most. End with one compact price-and-market context sentence. If the evidence does not establish why the share moved, do not invent a cause; say the reports do not fully explain it. No [n] markers, no publisher names, no advice.
- narration: 60 to 110 words, written to be read aloud by a presenter. Open with "${f.name}" and the most important development, then the other material changes, naming who reported each ("as The Economic Times reported"). Put the span and price move near the end, using a day like "Since 28 August", never a timestamp. Write numbers as digits; no symbols like ₹ or %, write "rupees" and "percent". No [n] markers. Never imply causation unless a source explicitly reports the market reaction.`,
        maxTokens: 2000,
        temperature: 0.3,
      });
      const parsed = parseStory(out);
      if (!parsed) return this.fallback.story(f);

      const points = parsed.points.flatMap((p) => {
        const idx = p.i.map((n) => n - 1).filter((n) => n >= 0 && n < f.evidence.length);
        const anchor = bestOf(f.evidence, idx);
        if (!anchor) return [];
        if (p.weight < TRIVIA) return []; // the model judged it noise for a shareholder; agree
        const title = unmarked(p.title);
        const detail = p.detail ? unmarked(p.detail) : null;
        const check = grounded(`${title} ${detail ?? ""}`, f);
        if (!check.ok) {
          this.log.warn({ symbol: f.symbol, reason: check.reason, title }, "story point failed grounding; dropped");
          return [];
        }
        return [pointFromEvidence(f, anchor, { title, detail, tone: p.tone, weight: p.weight })];
      });

      const leadText = tidyLead(unmarked(parsed.lead));
      const leadCheck = grounded(leadText, f);
      if (!leadCheck.ok) this.log.warn({ symbol: f.symbol, reason: leadCheck.reason }, "story lead failed grounding; keeping engine headline");
      const lead = leadCheck.ok && leadText.length > 0 && leadText.length <= 160 ? leadText : null;

      // The model may have judged everything noise; the template's honest list is better than an empty card.
      const base = await this.fallback.story(f);
      const finalPoints = points.length === 0 ? base.points : newestFirst(dedupePoints([...points, ...pricePoints(f)]));

      const summary = this.groundedOr(unmarked(parsed.summary), f, "summary", () => this.fallback.summary(f, finalPoints));
      const narration = this.groundedOr(unmarked(parsed.narration), f, "narration", () => this.fallback.narration(f, finalPoints));
      return { lead, points: finalPoints, summary, narration };
    } catch (err) {
      this.log.warn({ err: String(err), symbol: f.symbol }, "model story failed; using template");
      return this.fallback.story(f);
    }
  }

  /** A paragraph the model wrote, if every number in it is ours; otherwise the template's. */
  private groundedOr(text: string, f: StoryFacts, what: string, fallback: () => string): string {
    if (!text || text.length < 20) return fallback();
    const check = grounded(text, f);
    if (check.ok) return text;
    this.log.warn({ symbol: f.symbol, reason: check.reason, what }, "model paragraph failed grounding; using template");
    return fallback();
  }

  async report(f: StoryFacts): Promise<ReportBody> {
    const base = await this.fallback.report(f);
    try {
      const out = await this.model.complete({
        system: SYSTEM(),
        prompt: `${factsBlock(f)}\n\nTASK: Return JSON only, shape {"headline": string, "why": string|null, "sections": [{"title": string, "body": string}]}. Sections, in order: what happened (2 sentences, include the market vs stock split), why (2–4 sentences citing evidence as [n]; if none, say plainly that no filing or news explains it), what to watch (1–3 short lines). Total under 180 words. No advice. No exclamation marks.`,
        maxTokens: 700,
        temperature: 0.3,
      });
      const parsed = parseJson(out);
      if (!parsed) return base;
      const text = `${parsed.headline} ${parsed.why ?? ""} ${parsed.sections.map((s) => `${s.title} ${s.body}`).join(" ")}`;
      const check = grounded(text, f);
      if (!check.ok) {
        this.log.warn({ symbol: f.symbol, reason: check.reason }, "model report failed grounding; using template");
        return base;
      }
      return { headline: parsed.headline, why: parsed.why, sections: parsed.sections, writer: "model" };
    } catch (err) {
      this.log.warn({ err: String(err), symbol: f.symbol }, "model report failed; using template");
      return base;
    }
  }
}

/** "rose +2.7%" and "fell −1.1%" say the sign twice; arrows are not words. */
const tidyLead = (s: string): string =>
  s
    .replace(/\s*→\s*/g, " to ")
    .replace(/\b(rose|gained|climbed|jumped|advanced|added|up)\s+\+/gi, "$1 ")
    .replace(/\b(fell|dropped|slipped|declined|lost|down|lower|shed)\s+[−\-–]/gi, "$1 ")
    .replace(/\s+([,.;])/g, "$1")
    .trim();

/** Points the model weights below this are trivia a shareholder would not thank us for. */
const TRIVIA = 0.25;

const SYSTEM = (): string =>
  `You write for Since, a calm, factual app for Indian investors. Write in Indian English.
Rules: use ONLY the facts and evidence provided; never add numbers, names, causes or predictions that are not in them. Keep every number exactly as given. No advice, no buy/sell language, no urgency, no emoji, no exclamation marks. Prefer plain words over jargon. Refer to evidence by its number in square brackets.`;

function factsBlock(f: StoryFacts): string {
  const lines = [
    `STOCK: ${f.name} (${f.symbol})`,
    `WINDOW: since ${dayOf(f.since)} (${daysBetween(f.since, f.now)} days ago), as of ${dayOf(f.now)}`,
    `PRICE: ₹${f.priceThen} then, ₹${f.priceNow} now, change ${pct(f.move.totalPct)}`,
    `MARKET: Nifty 50 ${pct(f.move.indexPct)}; beta ${f.move.beta}; market part ${pct(f.move.marketPct)}; stock-specific part ${pct(f.move.stockPct)}`,
    `UNUSUALNESS: ${Math.abs(f.moveInSigmas).toFixed(1)}x its usual move` + (f.volumeRatio != null ? `; volume ${f.volumeRatio.toFixed(1)}x usual` : ""),
    `SIGNALS: ${f.signals.map((s) => s.summary).join(" | ") || "none"}`,
    `LEAD SENTENCE (already shown to the user): ${f.headline}`,
    f.events.nextResultsAt ? `NEXT RESULTS: ${f.events.nextResultsAt.toISOString().slice(0, 10)}` : "",
    "EVIDENCE:",
    ...(f.evidence.length
      ? f.evidence.map((e, i) => `[${i + 1}] ${e.publishedAt.toISOString().slice(0, 10)} ${e.kind === "filing" ? "EXCHANGE FILING" : e.source}: ${e.title}${e.summary ? ` — ${e.summary.slice(0, 300)}` : ""}`)
      : ["(none)"]),
  ];
  return lines.filter(Boolean).join("\n");
}

const sign = (n: number): string => (n > 0 ? `+${n}` : `${n}`);

/**
 * The rule, literally: every number in the output must appear in the input the
 * model was shown (the facts block + the lead sentence), and every [n] must be
 * a real evidence index. Comparison is numeric and sign‑blind so "−1.3%" and
 * "1.3" match, and tolerant to one decimal so 2.34 may be written as 2.3.
 * Small counting numbers and calendar values are always fine.
 */
export function grounded(text: string, f: StoryFacts): { ok: true } | { ok: false; reason: string } {
  const cites = [...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  const badCite = cites.find((n) => n < 1 || n > f.evidence.length);
  if (badCite !== undefined) return { ok: false, reason: `cites [${badCite}] but only ${f.evidence.length} sources exist` };

  const input = numbersIn(`${factsBlock(f)} ${f.headline}`);
  for (let i = 0; i <= 31; i++) input.push(i);
  for (let y = 2000; y <= 2100; y++) input.push(y);
  input.push(50, 52, 100); // Nifty 50, 52‑week, percent

  const stripped = text.replace(/\[\d+\]/g, "");
  const rejected = numbersIn(stripped).filter((v) => !input.some((x) => Math.abs(x - v) < 0.051));
  return rejected.length === 0 ? { ok: true } : { ok: false, reason: `numbers not in facts: ${rejected.join(", ")}` };
}

/** Absolute numeric values in a text; Indian and western digit grouping both stripped. */
const numbersIn = (text: string): number[] =>
  [...text.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Math.abs(Number(m[0].replace(/,/g, "")))).filter((n) => Number.isFinite(n));

interface ParsedStory {
  lead: string;
  summary: string;
  narration: string;
  points: { i: number[]; title: string; detail: string | null; tone: "up" | "down" | "neutral"; weight: number }[];
}

function parseStory(raw: string): ParsedStory | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    const j = JSON.parse(raw.slice(start, end + 1)) as { lead?: unknown; points?: unknown; summary?: unknown; narration?: unknown };
    if (!Array.isArray(j.points)) return null;
    const points = j.points
      .map((p): ParsedStory["points"][number] | null => {
        const o = p as Record<string, unknown>;
        if (typeof o.title !== "string" || !o.title.trim()) return null;
        const i = Array.isArray(o.i) ? o.i.map(Number).filter(Number.isInteger) : typeof o.i === "number" ? [o.i] : [];
        const tone = o.tone === "up" || o.tone === "down" ? o.tone : "neutral";
        const weight = typeof o.weight === "number" ? Math.min(1, Math.max(0, o.weight)) : 0.5;
        return { i, title: o.title.trim().slice(0, 120), detail: typeof o.detail === "string" && o.detail.trim() ? o.detail.trim().slice(0, 400) : null, tone, weight };
      })
      .filter((p): p is ParsedStory["points"][number] => p !== null)
      .slice(0, MAX_POINTS);
    return { lead: typeof j.lead === "string" ? j.lead : "", summary: typeof j.summary === "string" ? j.summary : "", narration: typeof j.narration === "string" ? j.narration : "", points };
  } catch {
    return null;
  }
}

function parseJson(raw: string): { headline: string; why: string | null; sections: { title: string; body: string }[] } | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    const j = JSON.parse(raw.slice(start, end + 1)) as { headline?: unknown; why?: unknown; sections?: unknown };
    if (typeof j.headline !== "string" || !Array.isArray(j.sections)) return null;
    const sections = j.sections
      .filter((s): s is { title: string; body: string } => !!s && typeof (s as { title?: unknown }).title === "string" && typeof (s as { body?: unknown }).body === "string")
      .slice(0, 4);
    if (sections.length === 0) return null;
    return { headline: j.headline, why: typeof j.why === "string" && j.why.trim() ? j.why : null, sections };
  } catch {
    return null;
  }
}

const dayOf = (d: Date): string => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" });
const daysBetween = (a: Date, b: Date): number => Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));
