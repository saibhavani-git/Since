import { displayName } from "../../../lib/format.js";
import type { Digest, DigestCard, QuietItem, ScriptSegment, SeriesPoint, VerdictTone } from "../../../contracts/index.js";
import { round } from "../../../lib/format.js";
import { newId } from "../../../lib/ids.js";
import type { RawCandle } from "../../../providers/market-data/index.js";
import { decompose } from "./decompose.js";
import { finalizeSignals, narrator } from "./narrate.js";
import { score } from "./rank.js";
import { detectSignals } from "./signals.js";
import { indexAtOrBefore, mean, pctChange } from "./stats.js";
import { DEFAULT_ENGINE_CONFIG, type EngineConfig, type EngineInput, type EngineItem } from "./types.js";

export { DEFAULT_ENGINE_CONFIG } from "./types.js";
export type { EngineConfig, EngineInput, EngineItem } from "./types.js";

/**
 * The digest engine. Pure: same input → same output. No clock, no I/O.
 * Orchestration (what data to fetch, what "since" is) lives in the service.
 */
export function buildDigest(input: EngineInput, config: EngineConfig = DEFAULT_ENGINE_CONFIG): Digest {
  const sessions = input.market.sessions;

  const indexThen = priceAt(input.index.candles, input.since, null);
  const indexNow = input.index.quote?.price ?? input.index.candles.at(-1)?.c ?? indexThen;
  const indexPct = pctChange(indexThen, indexNow);

  const evaluated = input.items.map((item) => evaluate(item, input, indexPct, sessions, config));

  const cards = evaluated
    .filter((e) => e.signals.length >= config.minSignals)
    .sort((a, b) => b.card.score - a.card.score)
    .slice(0, config.maxCards)
    .map((e) => e.card);
  const cardSymbols = new Set(cards.map((c) => c.symbol));
  const quiet = evaluated.filter((e) => !cardSymbols.has(e.card.symbol)).map((e) => e.quiet);

  const tone: VerdictTone = cards.length === 0 ? "nothing" : cards.some((c) => c.signals.some((s) => s.tier === 1)) ? "triggered" : "look";
  const verdict = narrator.verdict(tone, cards.length, quiet.length);
  const sinceLabel = narrator.sinceLabel(input.since, input.now);

  const script: ScriptSegment[] = [
    { id: "intro", kind: "intro", symbol: null, text: narrator.spoken.intro(sinceLabel, verdict) },
    ...cards.map((c): ScriptSegment => ({ id: `card:${c.symbol}`, kind: "card", symbol: c.symbol, text: c.headline })),
    ...(quiet.length
      ? [{ id: "quiet", kind: "quiet" as const, symbol: null, text: narrator.spoken.quiet(quiet.map((q) => q.name), quiet.length) }]
      : []),
    { id: "outro", kind: "outro", symbol: null, text: narrator.spoken.outro() },
  ];

  return {
    id: newId(),
    watchlistId: input.watchlistId,
    generatedAt: input.now.toISOString(),
    since: { at: input.since.toISOString(), reason: input.sinceReason },
    gap: {
      wallMs: Math.max(0, input.now.getTime() - input.since.getTime()),
      sessions,
      sinceLabel,
      openLabel: narrator.openLabel(sessions),
    },
    market: {
      phase: input.market.phase,
      indexSymbol: input.index.symbol,
      indexPct: round(indexPct, 2),
      headline: narrator.marketHeadline("Nifty 50", indexPct),
      holidayName: input.market.holidayName,
    },
    verdict,
    cards,
    quiet,
    unavailable: [],
    script,
    freshness: input.freshness,
  };
}

interface Evaluated {
  card: DigestCard;
  quiet: QuietItem;
  signals: DigestCard["signals"];
}

function evaluate(item: EngineItem, input: EngineInput, indexPct: number, sessions: number, config: EngineConfig): Evaluated {
  const sinceIdx = indexAtOrBefore(item.candles, input.since);
  const priceThen = priceAt(item.candles, input.since, item.snapshotPrice);
  const priceNow = item.quote.price;
  const totalPct = pctChange(priceThen, priceNow);

  const beforeCandles = item.candles.slice(0, sinceIdx + 1);
  const gapCandles = item.candles.slice(sinceIdx + 1);

  const ctx = decompose({
    totalPct,
    indexPct,
    indexSymbol: input.index.symbol,
    stockCandles: item.candles,
    indexCandles: input.index.candles,
    sessions,
    config,
  });

  const rawSignals = detectSignals(item, {
    since: input.since,
    now: input.now,
    priceThen,
    priceNow,
    gapCandles,
    beforeCandles,
    moveInSigmas: ctx.moveInSigmas,
    config,
  });

  const volumeRatio = volumeRatioFor(gapCandles, beforeCandles, item.quote.volume, item.quote.averageVolume);
  const narrationCtx = { name: displayName(item.instrument.name), priceNow, priceThen, totalPct, now: input.now };
  const signals = finalizeSignals(rawSignals, narrator, narrationCtx);
  const { series, sinceIndex } = buildSeries(item, input, sinceIdx, priceThen, config.contextSessions);

  const headline = narrator.headline(rawSignals[0] ?? null, narrationCtx, ctx.move);
  const card: DigestCard = {
    symbol: item.symbol,
    instrument: item.instrument,
    priceThen: round(priceThen, 2),
    priceNow: round(priceNow, 2),
    move: ctx.move,
    volatility: { dailySigmaPct: ctx.dailySigmaPct, moveInSigmas: ctx.moveInSigmas },
    volumeRatio,
    headline,
    why: null, // filled by the story layer from evidence; the engine has no I/O
    sources: [],
    story: [],
    summary: headline, // the story layer replaces these with the written paragraphs
    narration: headline,
    chips: narrator.chips(ctx.move, rawSignals, volumeRatio, input.freshness.stale),
    signals,
    score: score(rawSignals, ctx.moveInSigmas, config),
    series,
    sinceIndex,
  };

  const quiet: QuietItem = {
    symbol: item.symbol,
    name: item.instrument.name,
    priceNow: round(priceNow, 2),
    changePct: round(totalPct, 2),
    moveInSigmas: ctx.moveInSigmas,
    sparkline: series.slice(Math.max(0, sinceIndex - 6)).map((p) => p.c),
    note: null,
  };

  return { card, quiet, signals };
}

/**
 * Price at `since`: the checkpoint snapshot if we have one (exact), else the
 * last close at or before `since`, else the earliest candle we know.
 */
function priceAt(candles: readonly RawCandle[], since: Date, snapshot: number | null): number {
  if (snapshot && snapshot > 0) return snapshot;
  const i = indexAtOrBefore(candles, since);
  return (i >= 0 ? candles[i] : candles[0])?.c ?? 0;
}

function buildSeries(
  item: EngineItem,
  input: EngineInput,
  sinceIdx: number,
  priceThen: number,
  contextSessions: number,
): { series: SeriesPoint[]; sinceIndex: number } {
  const start = Math.max(0, sinceIdx - contextSessions + 1);
  const points: SeriesPoint[] = item.candles.slice(start).map((c) => ({ t: c.t.toISOString(), c: c.c }));

  // Insert the exact "you" point so the chart's dot sits on the real level.
  const sinceIso = input.since.toISOString();
  let sinceIndex = indexAtOrBefore(item.candles.slice(start), input.since);
  if (item.snapshotPrice) {
    points.splice(sinceIndex + 1, 0, { t: sinceIso, c: priceThen });
    sinceIndex += 1;
  }
  if (sinceIndex < 0) sinceIndex = 0;

  // Live quote as the final point when it is newer than the last candle.
  const last = points.at(-1);
  const asOf = item.quote.asOf.toISOString();
  if (!last || asOf > last.t) points.push({ t: asOf, c: item.quote.price });
  else if (last) last.c = item.quote.price;

  return { series: points, sinceIndex };
}

function volumeRatioFor(
  gap: readonly RawCandle[],
  before: readonly RawCandle[],
  todayVolume: number | null,
  averageVolume: number | null,
): number | null {
  const base = mean(before.slice(-20).map((c) => c.v ?? 0)) || averageVolume || 0;
  const during = gap.length ? mean(gap.map((c) => c.v ?? 0)) : (todayVolume ?? 0);
  if (!base || !during) return null;
  return round(during / base, 2);
}
