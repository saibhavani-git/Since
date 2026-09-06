import { z } from "zod";
import { Freshness, Id, IsoDateTime } from "./common.js";
import { Instrument, MarketPhase, Symbol } from "./market.js";

/**
 * Ranking tiers, in order. Lower wins.
 *  1 — a condition the user set has triggered
 *  2 — a scheduled event on the user's stock
 *  3 — a discrete market event
 *  4 — a statistically unusual, market‑adjusted move
 */
export const SignalTier = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type SignalTier = z.infer<typeof SignalTier>;

export const SignalKind = z.enum([
  "thesis_target_reached",
  "thesis_breakout",
  "thesis_results_landed",
  "results_upcoming",
  "ex_dividend_upcoming",
  "week52_high",
  "week52_low",
  "crossed_added_price",
  "round_number_crossed",
  "volume_spike",
  "unusual_move",
  "gap_open",
]);
export type SignalKind = z.infer<typeof SignalKind>;

export const Signal = z.object({
  kind: SignalKind,
  tier: SignalTier,
  at: IsoDateTime.nullable(),
  summary: z.string(),
  data: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
});
export type Signal = z.infer<typeof Signal>;

/** How much of a move was the market, and how much the stock itself. */
export const MoveDecomposition = z.object({
  totalPct: z.number(),
  marketPct: z.number(),
  stockPct: z.number(),
  beta: z.number(),
  indexSymbol: z.string(),
  indexPct: z.number(),
});
export type MoveDecomposition = z.infer<typeof MoveDecomposition>;

export const ChipTone = z.enum(["neutral", "rise", "fall", "market", "iris", "stale"]);
export const Chip = z.object({ label: z.string(), tone: ChipTone });
export type Chip = z.infer<typeof Chip>;

export const SeriesPoint = z.object({ t: IsoDateTime, c: z.number() });
export type SeriesPoint = z.infer<typeof SeriesPoint>;

/** Where a claim came from. Filings are official; news is press. */
export const Source = z.object({
  id: z.string(),
  kind: z.enum(["filing", "news"]),
  title: z.string(),
  url: z.string(),
  source: z.string(),
  publishedAt: IsoDateTime,
  category: z.string().nullable(),
  sentiment: z.number().nullable(),
});
export type Source = z.infer<typeof Source>;

export const StoryPointKind = z.enum(["news", "filing", "price"]);
export type StoryPointKind = z.infer<typeof StoryPointKind>;
export const StoryTone = z.enum(["up", "down", "neutral"]);
export type StoryTone = z.infer<typeof StoryTone>;

/**
 * One thing that happened to a stock while the reader was away.
 * Press and filings become points; so do the price milestones the engine
 * noticed. A card carries them newest first; the chart marks where they fall.
 */
export const StoryPoint = z.object({
  id: z.string(),
  kind: StoryPointKind,
  at: IsoDateTime,
  /** One clean line. Never a raw headline with the publisher glued on. */
  title: z.string(),
  /** A sentence or two more, when we have it. */
  detail: z.string().nullable(),
  /** Publisher, "BSE filing", or "Price". */
  source: z.string(),
  sourceUrl: z.string().nullable(),
  url: z.string().nullable(),
  /** Close on that day and the day's change, when candles cover it. */
  price: z.number().nullable(),
  dayChangePct: z.number().nullable(),
  tone: StoryTone,
  /** 0…1 — how much this mattered to the move. Drives ordering and chart markers. */
  weight: z.number(),
});
export type StoryPoint = z.infer<typeof StoryPoint>;

/** The one line a quiet stock still deserves when the papers wrote about it. */
export const QuietNote = z.object({ title: z.string(), source: z.string(), sourceUrl: z.string().nullable(), url: z.string(), at: IsoDateTime });
export type QuietNote = z.infer<typeof QuietNote>;

export const DigestCard = z.object({
  symbol: Symbol,
  instrument: Instrument,
  priceThen: z.number(),
  priceNow: z.number(),
  move: MoveDecomposition,
  volatility: z.object({ dailySigmaPct: z.number(), moveInSigmas: z.number() }),
  volumeRatio: z.number().nullable(),
  headline: z.string(),
  /** One grounded sentence on *why*, or null when no filing or news explains it. */
  why: z.string().nullable(),
  sources: z.array(Source),
  /** What happened, as a list — newest first. Empty until the story layer runs. */
  story: z.array(StoryPoint),
  /** The card's text: 3–5 plain sentences — the numbers, the key changes, what is ahead. */
  summary: z.string(),
  /** The same story as a presenter would read it aloud. What the voice says. */
  narration: z.string(),
  chips: z.array(Chip),
  signals: z.array(Signal),
  score: z.number(),
  /** Closing prices: a window before the gap, then the gap, then now. */
  series: z.array(SeriesPoint),
  /** Index into `series` of the last point at or before `since`. */
  sinceIndex: z.number().int().nonnegative(),
});
export type DigestCard = z.infer<typeof DigestCard>;

export const QuietItem = z.object({
  symbol: Symbol,
  name: z.string(),
  priceNow: z.number(),
  changePct: z.number(),
  moveInSigmas: z.number(),
  sparkline: z.array(z.number()),
  note: QuietNote.nullable(),
});
export type QuietItem = z.infer<typeof QuietItem>;

export const VerdictTone = z.enum(["nothing", "look", "triggered"]);
export type VerdictTone = z.infer<typeof VerdictTone>;
export const Verdict = z.object({
  tone: VerdictTone,
  headline: z.string(),
  subline: z.string(),
});
export type Verdict = z.infer<typeof Verdict>;

export const SinceReason = z.enum(["checkpoint", "previous_close", "first_visit", "requested"]);
export type SinceReason = z.infer<typeof SinceReason>;

export const Gap = z.object({
  wallMs: z.number().nonnegative(),
  sessions: z.number().int().nonnegative(),
  sinceLabel: z.string(),
  openLabel: z.string(),
});
export type Gap = z.infer<typeof Gap>;

export const MarketContext = z.object({
  phase: MarketPhase,
  indexSymbol: z.string(),
  indexPct: z.number(),
  headline: z.string(),
  holidayName: z.string().nullable(),
});
export type MarketContext = z.infer<typeof MarketContext>;

/**
 * The spoken version of the digest: one segment per screen of the story.
 * Clients send each `text` to `POST /v1/speech` as the story advances.
 */
export const ScriptSegment = z.object({
  id: z.string(),
  kind: z.enum(["intro", "card", "quiet", "outro"]),
  symbol: Symbol.nullable(),
  text: z.string(),
});
export type ScriptSegment = z.infer<typeof ScriptSegment>;

export const Digest = z.object({
  id: Id,
  watchlistId: Id,
  generatedAt: IsoDateTime,
  since: z.object({ at: IsoDateTime, reason: SinceReason }),
  gap: Gap,
  market: MarketContext,
  verdict: Verdict,
  cards: z.array(DigestCard),
  quiet: z.array(QuietItem),
  /** Watched stocks we could not get data for this time. Shown, never hidden. */
  unavailable: z.array(z.object({ symbol: Symbol, name: z.string() })),
  script: z.array(ScriptSegment),
  freshness: Freshness,
});
export type Digest = z.infer<typeof Digest>;

export const SpeechRequest = z.object({
  text: z.string().trim().min(1).max(1200),
});
export type SpeechRequest = z.infer<typeof SpeechRequest>;

export const DigestQuery = z.object({
  /** Override the checkpoint: "what changed since this instant?" */
  since: IsoDateTime.optional(),
});
export type DigestQuery = z.infer<typeof DigestQuery>;

export const DigestResponse = z.object({ digest: Digest });

/** The in‑depth view behind a card. Every sentence traces to a number we computed or a source we list. */
export const ReportSection = z.object({ title: z.string(), body: z.string() });
export const Report = z.object({
  symbol: Symbol,
  instrument: Instrument,
  since: IsoDateTime,
  generatedAt: IsoDateTime,
  headline: z.string(),
  why: z.string().nullable(),
  sections: z.array(ReportSection),
  numbers: z.array(z.object({ label: z.string(), value: z.string() })),
  sources: z.array(Source),
  move: MoveDecomposition,
  series: z.array(SeriesPoint),
  sinceIndex: z.number().int().nonnegative(),
  /** `model` when a language model wrote the prose from our facts; `template` otherwise. */
  writer: z.enum(["model", "template"]),
  freshness: Freshness,
});
export type Report = z.infer<typeof Report>;

export const ReportQuery = z.object({
  /** Defaults to seven days ago. */
  since: IsoDateTime.optional(),
});
export const ReportResponse = z.object({ report: Report });
export type ReportResponse = z.infer<typeof ReportResponse>;

/** The paper trail behind a stock: filings first, then the press. */
export const NewsResponse = z.object({ symbol: Symbol, since: IsoDateTime, sources: z.array(Source) });
export type NewsResponse = z.infer<typeof NewsResponse>;

export const SeenResponse = z.object({
  seenAt: IsoDateTime,
  snapshotCount: z.number().int().nonnegative(),
});

/** POST /v1/digest/cards — "since this moment, for these stocks": one card each. */
export const CardsRequest = z.object({
  symbols: z.array(Symbol).min(1).max(25),
  since: IsoDateTime,
  /** Defaults to now. */
  until: IsoDateTime.optional(),
});
export type CardsRequest = z.infer<typeof CardsRequest>;

export const CardsResponse = z.object({
  since: IsoDateTime,
  until: IsoDateTime,
  generatedAt: IsoDateTime,
  gap: Gap,
  market: Digest.shape.market,
  freshness: Digest.shape.freshness,
  /** Ordered by how much each mattered. Every requested symbol we could price is here. */
  cards: z.array(DigestCard),
  unavailable: Digest.shape.unavailable,
});
export type CardsResponse = z.infer<typeof CardsResponse>;
