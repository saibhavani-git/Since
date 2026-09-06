import type { MoveDecomposition } from "../../../contracts/index.js";
import type { RawCandle } from "../../../providers/market-data/index.js";
import { round } from "../../../lib/format.js";
import { beta, clamp, dailyReturns, stdev } from "./stats.js";
import type { EngineConfig } from "./types.js";

export interface MoveContext {
  /** Realised daily σ of the stock's own (market‑adjusted) returns, in %. */
  dailySigmaPct: number;
  /** The stock‑specific part of the move, in σ units scaled to the gap length. */
  moveInSigmas: number;
  move: MoveDecomposition;
}

/**
 * total = β·index + stock. The stock part is what the user's attention
 * should go to; the market part is context.
 */
export function decompose(args: {
  totalPct: number;
  indexPct: number;
  indexSymbol: string;
  stockCandles: readonly RawCandle[];
  indexCandles: readonly RawCandle[];
  sessions: number;
  config: EngineConfig;
}): MoveContext {
  const { config } = args;
  const rawBeta = beta(args.stockCandles, args.indexCandles);
  const b = rawBeta === null ? 1 : clamp(rawBeta, config.betaMin, config.betaMax);

  const marketPct = b * args.indexPct;
  const stockPct = args.totalPct - marketPct;

  // Residual volatility: σ of (stock return − β·index return), over the last year.
  const stockRets = dailyReturns(args.stockCandles.slice(-260));
  const indexRets = dailyReturns(args.indexCandles.slice(-260));
  const n = Math.min(stockRets.length, indexRets.length);
  const residuals =
    n >= 30
      ? stockRets.slice(-n).map((r, i) => r - b * indexRets.slice(-n)[i]!)
      : stockRets;
  const sigmaDaily = stdev(residuals) * 100 || 1.5; // fall back to a sane σ for thin histories
  const horizonSigma = sigmaDaily * Math.sqrt(Math.max(1, args.sessions));

  return {
    dailySigmaPct: round(sigmaDaily, 2),
    moveInSigmas: round(stockPct / horizonSigma, 2),
    move: {
      totalPct: round(args.totalPct, 2),
      marketPct: round(marketPct, 2),
      stockPct: round(stockPct, 2),
      beta: round(b, 2),
      indexSymbol: args.indexSymbol,
      indexPct: round(args.indexPct, 2),
    },
  };
}
