import type { RawCandle } from "../../../providers/market-data/index.js";

/** Simple daily returns (fractions) from closes. */
export function dailyReturns(candles: readonly RawCandle[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1]!.c;
    if (prev > 0) out.push(candles[i]!.c / prev - 1);
  }
  return out;
}

export const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function stdev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1));
}

/**
 * OLS β of stock returns on index returns, aligned by calendar day so a
 * missing session on one side doesn't shift the whole series.
 */
export function beta(stock: readonly RawCandle[], index: readonly RawCandle[]): number | null {
  const byDay = new Map<string, number>();
  const idxRet = pairReturns(index);
  for (const [day, r] of idxRet) byDay.set(day, r);

  const xs: number[] = [];
  const ys: number[] = [];
  for (const [day, r] of pairReturns(stock)) {
    const ir = byDay.get(day);
    if (ir !== undefined) {
      xs.push(ir);
      ys.push(r);
    }
  }
  if (xs.length < 30) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let cov = 0;
  let varx = 0;
  for (let i = 0; i < xs.length; i++) {
    cov += (xs[i]! - mx) * (ys[i]! - my);
    varx += (xs[i]! - mx) ** 2;
  }
  return varx === 0 ? null : cov / varx;
}

function pairReturns(candles: readonly RawCandle[]): [string, number][] {
  const out: [string, number][] = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1]!.c;
    if (prev > 0) out.push([dayKey(candles[i]!.t), candles[i]!.c / prev - 1]);
  }
  return out;
}

const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

/** Index of the last candle whose time is ≤ `at`, or -1. */
export function indexAtOrBefore(candles: readonly RawCandle[], at: Date): number {
  let lo = 0;
  let hi = candles.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (candles[mid]!.t <= at) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
export const pctChange = (from: number, to: number): number => (from > 0 ? ((to - from) / from) * 100 : 0);
