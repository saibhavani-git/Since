import type { DigestCard, MoveDecomposition, Signal, Source, StoryPoint } from "../../../contracts/index.js";
import type { EvidenceItem } from "../../../providers/news/index.js";

/** Facts the writer may use. Nothing else exists as far as it is concerned. */
export interface StoryFacts {
  symbol: string;
  name: string;
  since: Date;
  now: Date;
  priceThen: number;
  priceNow: number;
  move: MoveDecomposition;
  moveInSigmas: number;
  volumeRatio: number | null;
  signals: Signal[];
  headline: string;
  evidence: EvidenceItem[];
  events: { nextResultsAt: Date | null; exDividendAt: Date | null };
  /** Closes around the window (same as the card's chart) so points can be placed on it. */
  series: { t: Date; c: number }[];
  sinceIndex: number;
}

/** What the card shows: an optional better first line, and the list of things that happened. */
export interface Story {
  /** One line that says what happened and, when the evidence shows it, why. Null keeps the engine's price line. */
  lead: string | null;
  /** Newest first. */
  points: StoryPoint[];
  /** On-screen paragraph. */
  summary: string;
  /** Spoken paragraph, presenter style. */
  narration: string;
}

export interface ReportBody {
  headline: string;
  why: string | null;
  sections: { title: string; body: string }[];
  writer: "model" | "template";
}

/**
 * Port: turns facts into prose. Implementations must not add facts.
 * `why` is one sentence for the card; `report` is the in‑depth view.
 */
export interface StoryWriter {
  readonly name: string;
  why(facts: StoryFacts): Promise<string | null>;
  story(facts: StoryFacts): Promise<Story>;
  report(facts: StoryFacts): Promise<ReportBody>;
}

export const toSource = (e: EvidenceItem): Source => ({
  id: e.id,
  kind: e.kind,
  title: e.title,
  url: e.url,
  source: e.source,
  publishedAt: e.publishedAt.toISOString(),
  category: e.category,
  sentiment: e.sentiment,
});

export type CardFacts = Pick<DigestCard, "symbol" | "priceThen" | "priceNow" | "move" | "volatility" | "volumeRatio" | "signals" | "headline">;
