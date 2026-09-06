import type { Freshness, Instrument, MarketPhase, SinceReason, Thesis } from "../../../contracts/index.js";
import type { RawCandle, RawEvents, RawQuote } from "../../../providers/market-data/index.js";

/** Everything the engine needs about one watched stock. No I/O behind any field. */
export interface EngineItem {
  symbol: string;
  instrument: Instrument;
  thesis: Thesis | null;
  addedAt: Date;
  addedPrice: number | null;
  quote: RawQuote;
  /** Daily candles, oldest first, ideally ≥ 1 year. */
  candles: RawCandle[];
  events: RawEvents;
  /** Exact price at the checkpoint, when one exists. */
  snapshotPrice: number | null;
}

export interface EngineInput {
  watchlistId: string;
  now: Date;
  since: Date;
  sinceReason: SinceReason;
  items: EngineItem[];
  index: { symbol: string; quote: RawQuote | null; candles: RawCandle[] };
  market: { phase: MarketPhase; holidayName: string | null; sessions: number };
  freshness: Freshness;
}

/** Thresholds live here, not scattered as literals. */
export interface EngineConfig {
  /** |z| at which a market‑adjusted move counts as unusual. */
  unusualSigma: number;
  /** Gap‑period volume ÷ 20‑day average that counts as a spike. */
  volumeSpikeRatio: number;
  /** Open vs previous close, in %, that counts as a gap open. */
  gapOpenPct: number;
  /** Days ahead within which scheduled events matter. */
  upcomingEventDays: number;
  /** β is clamped to keep one noisy year from producing absurd attributions. */
  betaMin: number;
  betaMax: number;
  /** Cards shown; the rest is quiet. */
  maxCards: number;
  /** Signals needed to earn a card. 1 for the digest; 0 when a caller wants the numbers regardless (the report). */
  minSignals: number;
  /** Sessions of context drawn before the gap on each card. */
  contextSessions: number;
  tierWeight: Record<1 | 2 | 3 | 4, number>;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  unusualSigma: 1.5,
  volumeSpikeRatio: 2,
  gapOpenPct: 2,
  upcomingEventDays: 7,
  betaMin: 0.2,
  betaMax: 2.5,
  maxCards: 5,
  minSignals: 1,
  contextSessions: 20,
  tierWeight: { 1: 100, 2: 80, 3: 60, 4: 40 },
};
