import type { Clock } from "../../lib/clock.js";
import { AppError } from "../../lib/errors.js";
import type { Logger } from "../../lib/logger.js";
import { SingleFlight } from "../../lib/single-flight.js";
import type { MarketCache, MarketDataProvider, RawCandle, RawEvents, RawQuote } from "./ports.js";

export interface CacheTtls {
  quoteSeconds: number;
  candleSeconds: number;
  eventSeconds: number;
}

/**
 * Decorator: cache in front of any provider, with stale‑on‑error.
 *
 * Fresh hit → serve. Miss → fetch, store. Fetch fails and a stale value
 * exists → serve it and mark `stale`, so the UI can say so. Fetch fails with
 * nothing cached → the error propagates; we never invent a number.
 */
export class CachedMarketDataProvider implements MarketDataProvider {
  readonly name: string;
  readonly delayMinutes: number;
  /** Symbols served stale during this process' lifetime (for freshness flags). */
  private readonly staleKeys = new Set<string>();
  private readonly flight = new SingleFlight();
  readonly stats = { hits: 0, misses: 0, stale: 0 };

  constructor(
    private readonly inner: MarketDataProvider,
    private readonly cache: MarketCache,
    private readonly ttl: CacheTtls,
    private readonly clock: Clock,
    private readonly log: Logger,
  ) {
    this.name = inner.name;
    this.delayMinutes = inner.delayMinutes;
  }

  isStale(symbol: string): boolean {
    return this.staleKeys.has(`quote:${symbol}`) || this.staleKeys.has(`candles:${symbol}`);
  }

  async getQuotes(symbols: readonly string[]): Promise<Map<string, RawQuote>> {
    const out = new Map<string, RawQuote>();
    const missing: string[] = [];

    const hits = await Promise.all(symbols.map((s) => this.cache.get<SerializedQuote>(`quote:${s}`)));
    symbols.forEach((s, i) => {
      const hit = hits[i];
      if (hit && this.fresh(hit.fetchedAt, this.ttl.quoteSeconds)) {
        out.set(s, reviveQuote(hit.value));
        this.staleKeys.delete(`quote:${s}`);
        this.stats.hits++;
      } else {
        missing.push(s);
        this.stats.misses++;
      }
    });
    if (missing.length === 0) return out;

    // One upstream call per distinct symbol set per process, however many callers.
    const fetched = await this.flight.run(`quotes:${[...missing].sort().join(",")}`, () => this.fetchQuotes(missing));
    for (const [s, q] of fetched) out.set(s, q);
    return out;
  }

  private async fetchQuotes(missing: string[]): Promise<Map<string, RawQuote>> {
    const out = new Map<string, RawQuote>();
    try {
      const fetched = await this.inner.getQuotes(missing);
      const now = this.clock.now();
      await Promise.all(
        [...fetched].map(([s, q]) => {
          out.set(s, q);
          this.staleKeys.delete(`quote:${s}`);
          return this.cache.set(`quote:${s}`, serializeQuote(q), now);
        }),
      );
    } catch (err) {
      let recovered = 0;
      for (const s of missing) {
        const stale = await this.cache.get<SerializedQuote>(`quote:${s}`);
        if (stale) {
          out.set(s, reviveQuote(stale.value));
          this.staleKeys.add(`quote:${s}`);
          recovered++;
          this.stats.stale++;
        }
      }
      if (recovered < missing.length) throw err;
      this.log.warn({ err: describe(err), symbols: missing }, "serving stale quotes");
    }
    return out;
  }

  async getDailyCandles(symbol: string, from: Date): Promise<RawCandle[]> {
    const key = `candles:${symbol}`;
    const hit = await this.cache.get<SerializedCandle[]>(key);
    if (hit && this.fresh(hit.fetchedAt, this.ttl.candleSeconds) && covers(hit.value, from)) {
      this.staleKeys.delete(key);
      this.stats.hits++;
      return hit.value.map(reviveCandle).filter((c) => c.t >= from);
    }
    this.stats.misses++;
    return this.flight.run(key, async () => {
      try {
        // Always fetch a generous window so one cache entry serves every caller.
        const wide = new Date(Math.min(from.getTime(), this.clock.now().getTime() - 420 * 86_400_000));
        const candles = await this.inner.getDailyCandles(symbol, wide);
        await this.cache.set(key, candles.map(serializeCandle), this.clock.now());
        this.staleKeys.delete(key);
        return candles.filter((c) => c.t >= from);
      } catch (err) {
        if (hit) {
          this.staleKeys.add(key);
          this.stats.stale++;
          this.log.warn({ err: describe(err), symbol }, "serving stale candles");
          return hit.value.map(reviveCandle).filter((c) => c.t >= from);
        }
        throw err;
      }
    });
  }

  async getEvents(symbol: string): Promise<RawEvents> {
    const key = `events:${symbol}`;
    const hit = await this.cache.get<SerializedEvents>(key);
    if (hit && this.fresh(hit.fetchedAt, this.ttl.eventSeconds)) return reviveEvents(hit.value);
    return this.flight.run(key, async () => {
      const events = await this.inner.getEvents(symbol);
      await this.cache.set(key, serializeEvents(events), this.clock.now());
      return events;
    });
  }

  private fresh(fetchedAt: Date, ttlSeconds: number): boolean {
    return this.clock.now().getTime() - fetchedAt.getTime() < ttlSeconds * 1000;
  }
}

/* JSON has no Date; the cache stores ISO strings. */
type SerializedQuote = Omit<RawQuote, "asOf"> & { asOf: string };
type SerializedCandle = Omit<RawCandle, "t"> & { t: string };
type SerializedEvents = { nextResultsAt: string | null; lastResultsAt: string | null; exDividendAt: string | null };

const serializeQuote = (q: RawQuote): SerializedQuote => ({ ...q, asOf: q.asOf.toISOString() });
const reviveQuote = (q: SerializedQuote): RawQuote => ({ ...q, asOf: new Date(q.asOf) });
const serializeCandle = (c: RawCandle): SerializedCandle => ({ ...c, t: c.t.toISOString() });
const reviveCandle = (c: SerializedCandle): RawCandle => ({ ...c, t: new Date(c.t) });
const serializeEvents = (e: RawEvents): SerializedEvents => ({
  nextResultsAt: e.nextResultsAt?.toISOString() ?? null,
  lastResultsAt: e.lastResultsAt?.toISOString() ?? null,
  exDividendAt: e.exDividendAt?.toISOString() ?? null,
});
const reviveEvents = (e: SerializedEvents): RawEvents => ({
  nextResultsAt: e.nextResultsAt ? new Date(e.nextResultsAt) : null,
  lastResultsAt: e.lastResultsAt ? new Date(e.lastResultsAt) : null,
  exDividendAt: e.exDividendAt ? new Date(e.exDividendAt) : null,
});
const covers = (candles: SerializedCandle[], from: Date): boolean => {
  const first = candles[0];
  return !!first && new Date(first.t) <= from;
};
const describe = (err: unknown): string => (err instanceof AppError ? err.message : String(err));
