import type { Signal, SignalKind, SignalTier } from "../../../contracts/index.js";
import type { RawCandle } from "../../../providers/market-data/index.js";
import { mean } from "./stats.js";
import type { EngineConfig, EngineItem } from "./types.js";

export interface SignalContext {
  since: Date;
  now: Date;
  priceThen: number;
  priceNow: number;
  /** Candles strictly inside the gap (after `since`). */
  gapCandles: readonly RawCandle[];
  /** Candles before the gap, for baselines. */
  beforeCandles: readonly RawCandle[];
  moveInSigmas: number;
  config: EngineConfig;
}

/** A detected signal before narration. `summary` is filled in by `narrate`. */
export type RawSignal = Omit<Signal, "summary">;

const TIER: Record<SignalKind, SignalTier> = {
  thesis_target_reached: 1,
  thesis_breakout: 1,
  thesis_results_landed: 1,
  results_upcoming: 2,
  ex_dividend_upcoming: 2,
  week52_high: 3,
  week52_low: 3,
  crossed_added_price: 3,
  round_number_crossed: 3,
  volume_spike: 3,
  unusual_move: 4,
  gap_open: 4,
};

const signal = (kind: SignalKind, at: Date | null, data: RawSignal["data"] = {}): RawSignal => ({
  kind,
  tier: TIER[kind],
  at: at?.toISOString() ?? null,
  data,
});

/** Every rule is a small pure function. Adding a signal = one function + one line in `RULES`. */
type Rule = (item: EngineItem, ctx: SignalContext) => RawSignal | null;

const thesisTarget: Rule = (item, ctx) => {
  if (item.thesis?.kind !== "target_price") return null;
  const target = item.thesis.price;
  const hit = crossed(ctx.priceThen, ctx.priceNow, target) ?? touched(ctx.gapCandles, target);
  if (!hit) return null;
  return signal("thesis_target_reached", hit.at, { target, stillBeyond: hit.stillBeyond });
};

const thesisBreakout: Rule = (item, ctx) => {
  if (item.thesis?.kind !== "breakout_above") return null;
  const level = item.thesis.price;
  if (ctx.priceThen <= level && ctx.priceNow > level) return signal("thesis_breakout", ctx.now, { level });
  return null;
};

const thesisResults: Rule = (item, ctx) => {
  if (item.thesis?.kind !== "through_results") return null;
  const landed = item.events.lastResultsAt;
  if (landed && landed > ctx.since && landed <= ctx.now) return signal("thesis_results_landed", landed, {});
  return null;
};

const resultsUpcoming: Rule = (item, ctx) => {
  const at = item.events.nextResultsAt;
  if (!at) return null;
  const days = (at.getTime() - ctx.now.getTime()) / 86_400_000;
  if (days < 0 || days > ctx.config.upcomingEventDays) return null;
  return signal("results_upcoming", at, { inDays: Math.ceil(days) });
};

const exDividendUpcoming: Rule = (item, ctx) => {
  const at = item.events.exDividendAt;
  if (!at) return null;
  const days = (at.getTime() - ctx.now.getTime()) / 86_400_000;
  if (days < 0 || days > ctx.config.upcomingEventDays) return null;
  return signal("ex_dividend_upcoming", at, { inDays: Math.ceil(days) });
};

const week52High: Rule = (item, ctx) => {
  const high = item.quote.fiftyTwoWeekHigh;
  if (!high || ctx.gapCandles.length === 0) return null;
  const top = ctx.gapCandles.reduce((m, c) => (c.h > m.h ? c : m));
  if (top.h >= high * 0.999) return signal("week52_high", top.t, { level: high });
  return null;
};

const week52Low: Rule = (item, ctx) => {
  const low = item.quote.fiftyTwoWeekLow;
  if (!low || ctx.gapCandles.length === 0) return null;
  const bottom = ctx.gapCandles.reduce((m, c) => (c.l < m.l ? c : m));
  if (bottom.l <= low * 1.001) return signal("week52_low", bottom.t, { level: low });
  return null;
};

const crossedAddedPrice: Rule = (item, ctx) => {
  if (!item.addedPrice || item.addedAt >= ctx.since) return null;
  const hit = crossed(ctx.priceThen, ctx.priceNow, item.addedPrice);
  return hit ? signal("crossed_added_price", ctx.now, { level: item.addedPrice, above: ctx.priceNow > item.addedPrice }) : null;
};

const roundNumber: Rule = (_item, ctx) => {
  const step = ctx.priceNow >= 5000 ? 500 : ctx.priceNow >= 1000 ? 100 : ctx.priceNow >= 200 ? 50 : ctx.priceNow >= 50 ? 10 : 0;
  if (!step) return null;
  const a = Math.floor(ctx.priceThen / step);
  const b = Math.floor(ctx.priceNow / step);
  if (a === b) return null;
  const level = (ctx.priceNow > ctx.priceThen ? b : a) * step;
  // Only worth a card when the move itself is not trivial.
  if (Math.abs(ctx.priceNow - ctx.priceThen) / ctx.priceThen < 0.01) return null;
  return signal("round_number_crossed", ctx.now, { level, above: ctx.priceNow > level });
};

const volumeSpike: Rule = (_item, ctx) => {
  if (ctx.gapCandles.length === 0) return null;
  const base = mean(ctx.beforeCandles.slice(-20).map((c) => c.v ?? 0));
  const during = mean(ctx.gapCandles.map((c) => c.v ?? 0));
  if (!base || !during) return null;
  const ratio = during / base;
  return ratio >= ctx.config.volumeSpikeRatio ? signal("volume_spike", null, { ratio: Math.round(ratio * 10) / 10 }) : null;
};

const unusualMove: Rule = (_item, ctx) =>
  Math.abs(ctx.moveInSigmas) >= ctx.config.unusualSigma ? signal("unusual_move", null, { sigmas: ctx.moveInSigmas }) : null;

const gapOpen: Rule = (item, ctx) => {
  const last = ctx.gapCandles.at(-1);
  if (!last || !item.quote.open) return null;
  const pct = ((item.quote.open - item.quote.previousClose) / item.quote.previousClose) * 100;
  return Math.abs(pct) >= ctx.config.gapOpenPct ? signal("gap_open", last.t, { pct: Math.round(pct * 10) / 10 }) : null;
};

const RULES: readonly Rule[] = [
  thesisTarget,
  thesisBreakout,
  thesisResults,
  resultsUpcoming,
  exDividendUpcoming,
  week52High,
  week52Low,
  crossedAddedPrice,
  roundNumber,
  volumeSpike,
  unusualMove,
  gapOpen,
];

export function detectSignals(item: EngineItem, ctx: SignalContext): RawSignal[] {
  const found: RawSignal[] = [];
  for (const rule of RULES) {
    const s = rule(item, ctx);
    if (s) found.push(s);
  }
  // A 52‑week high and a round number on the same move are one story, not two.
  if (found.some((s) => s.kind === "week52_high" || s.kind === "week52_low")) {
    return found.filter((s) => s.kind !== "round_number_crossed");
  }
  return found.sort((a, b) => a.tier - b.tier);
}

function crossed(then: number, now: number, level: number): { at: Date | null; stillBeyond: boolean } | null {
  if ((then < level && now >= level) || (then > level && now <= level)) return { at: null, stillBeyond: true };
  return null;
}

function touched(candles: readonly RawCandle[], level: number): { at: Date; stillBeyond: boolean } | null {
  for (const c of candles) if (c.l <= level && level <= c.h) return { at: c.t, stillBeyond: false };
  return null;
}
