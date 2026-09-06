import type { Clock } from "../../lib/clock.js";
import { addDays, istDate, istParts } from "../../lib/ist.js";
import { INDEX_SYMBOL, type MarketDataProvider, type RawCandle, type RawEvents, type RawQuote } from "./ports.js";

/**
 * Deterministic synthetic market. Every symbol gets a reproducible random
 * walk seeded by its name, correlated with a synthetic index so the beta
 * decomposition has something real to find. Offline, instant, stable —
 * used by tests and demos.
 */
export class FixtureMarketDataProvider implements MarketDataProvider {
  readonly name = "fixture";
  readonly delayMinutes = 0;

  constructor(
    private readonly clock: Clock,
    private readonly basePrices: ReadonlyMap<string, number>,
  ) {}

  async getQuotes(symbols: readonly string[]): Promise<Map<string, RawQuote>> {
    const out = new Map<string, RawQuote>();
    for (const symbol of symbols) {
      const candles = this.series(symbol, addDays(this.clock.now(), -400));
      const last = candles.at(-1);
      const prev = candles.at(-2);
      if (!last || !prev) continue;
      const year = candles.slice(-250);
      out.set(symbol, {
        symbol,
        price: last.c,
        previousClose: prev.c,
        open: last.o,
        dayHigh: last.h,
        dayLow: last.l,
        volume: last.v,
        averageVolume: avg(year.map((c) => c.v ?? 0)),
        fiftyTwoWeekHigh: Math.max(...year.map((c) => c.h)),
        fiftyTwoWeekLow: Math.min(...year.map((c) => c.l)),
        asOf: last.t,
      });
    }
    return out;
  }

  async getDailyCandles(symbol: string, from: Date): Promise<RawCandle[]> {
    return this.series(symbol, from);
  }

  async getEvents(symbol: string): Promise<RawEvents> {
    if (symbol === INDEX_SYMBOL) return { nextResultsAt: null, lastResultsAt: null, exDividendAt: null };
    // Results land on a symbol‑specific day of a 90‑day cycle.
    const cycleDay = seedFrom(symbol) % 90;
    const today = Math.floor(this.clock.now().getTime() / 86_400_000);
    const daysUntil = (cycleDay - (today % 90) + 90) % 90;
    const next = addDays(this.clock.now(), daysUntil);
    const last = addDays(next, -90);
    return { nextResultsAt: daysUntil <= 30 ? next : null, lastResultsAt: last, exDividendAt: null };
  }

  private series(symbol: string, from: Date): RawCandle[] {
    const now = this.clock.now();
    const base = this.basePrices.get(symbol) ?? 500 + (seedFrom(symbol) % 3000);
    const rand = mulberry32(seedFrom(symbol));
    const indexRand = mulberry32(seedFrom(INDEX_SYMBOL));
    const isIndex = symbol === INDEX_SYMBOL;
    const beta = isIndex ? 1 : 0.6 + (seedFrom(symbol) % 100) / 100; // 0.6–1.6
    const sigma = isIndex ? 0.009 : 0.014 + (seedFrom(symbol) % 7) / 1000; // daily σ

    const out: RawCandle[] = [];
    let price = base * 0.9;
    let day = addDays(now, -420);
    while (day <= now) {
      const p = istParts(day);
      if (p.dow !== 0 && p.dow !== 6) {
        const mkt = gaussian(indexRand) * 0.009;
        const own = gaussian(rand) * sigma;
        const ret = isIndex ? mkt : beta * mkt + own + 0.0003;
        const open = price;
        const close = Math.max(1, open * (1 + ret));
        const high = Math.max(open, close) * (1 + Math.abs(gaussian(rand)) * 0.004);
        const low = Math.min(open, close) * (1 - Math.abs(gaussian(rand)) * 0.004);
        const t = istDate(p.y, p.m, p.d, 15 * 60 + 30);
        if (t >= from && t <= now) {
          out.push({ t, o: round2(open), h: round2(high), l: round2(low), c: round2(close), v: Math.round(2e6 + rand() * 6e6) });
        }
        price = close;
      }
      day = addDays(day, 1);
    }
    return out;
  }
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function seedFrom(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
