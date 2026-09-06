import type { Candle, CandleRange, Freshness, Instrument, InstrumentEvents, MarketStatus, Quote, StockDetail } from "../../contracts/index.js";
import type { Clock } from "../../lib/clock.js";
import { NotFoundError } from "../../lib/errors.js";
import { round } from "../../lib/format.js";
import { addDays } from "../../lib/ist.js";
import type { CachedMarketDataProvider, InstrumentSearch, RawCandle, RawQuote } from "../../providers/market-data/index.js";
import type { InstrumentRow } from "../../db/schema.js";
import { statusAt } from "./calendar.js";
import type { MarketRepository } from "./market.repository.js";

const RANGE_DAYS: Record<CandleRange, number> = { "1M": 31, "3M": 92, "6M": 183, "1Y": 366 };

/**
 * Everything above the provider: instrument lookup, contract shaping,
 * freshness stamping. Both HTTP routes and the digest use this.
 */
export class MarketService {
  constructor(
    private readonly repo: MarketRepository,
    private readonly data: CachedMarketDataProvider,
    private readonly clock: Clock,
    /** The whole exchange, not just what we have seen before. Optional so tests and fixtures need not reach out. */
    private readonly lookup: InstrumentSearch | null = null,
  ) {}

  status(): MarketStatus {
    return statusAt(this.clock.now());
  }

  /**
   * Any listed stock. What we already know answers instantly; the exchange
   * index fills the rest and what it finds is remembered, so the next person
   * typing "irfc" gets it from our own table.
   */
  async search(q: string): Promise<Instrument[]> {
    const term = q.trim();
    if (term.length < 1) return [];
    const local = (await this.repo.search(term)).map(toInstrument);
    if (!this.lookup || (local.length >= 6 && term.length < 3)) return local;
    let remote: Instrument[] = [];
    try {
      remote = await this.lookup.search(term);
    } catch {
      return local; // search must never fail because Yahoo hiccuped
    }
    const fresh = remote.filter((r) => !local.some((l) => l.symbol === r.symbol));
    if (fresh.length) await this.repo.upsertInstruments(fresh);
    return rankMatches([...local, ...fresh], term).slice(0, 12);
  }

  async instrument(symbol: string): Promise<Instrument> {
    const row = await this.repo.findInstrument(symbol);
    if (row) return toInstrument(row);
    // Never seen it: ask the exchange index by ticker, and remember the answer.
    if (this.lookup) {
      const hit = (await this.lookup.search(symbol).catch(() => [])).find((h) => h.symbol === symbol.toUpperCase());
      if (hit) {
        await this.repo.upsertInstruments([hit]);
        return hit;
      }
    }
    throw new NotFoundError(`Stock ${symbol}`);
  }

  async instruments(symbols: readonly string[]): Promise<Map<string, Instrument>> {
    const rows = await this.repo.findInstruments(symbols);
    const known = new Map(rows.map((r) => [r.symbol, toInstrument(r)]));
    // Anything unknown gets one lookup each — a partner may send a ticker we have never stored.
    await Promise.all(symbols.filter((s) => !known.has(s)).map(async (s) => this.instrument(s).then((i) => known.set(s, i)).catch(() => undefined)));
    return known;
  }

  async quotes(symbols: readonly string[]): Promise<Map<string, Quote>> {
    const routed = await this.route(symbols);
    const raw = await this.data.getQuotes([...routed.values()]);
    const out = new Map<string, Quote>();
    for (const [symbol, dataSymbol] of routed) {
      const q = raw.get(dataSymbol);
      if (q) out.set(symbol, this.toQuote({ ...q, symbol }));
    }
    return out;
  }

  /**
   * Where a symbol's prices come from. Most names trade on NSE; a BSE‑only
   * listing is fetched as `SYMBOL:BSE`. Explicit `:BSE` requests pass through.
   */
  private async route(symbols: readonly string[]): Promise<Map<string, string>> {
    const bare = symbols.filter((s) => !s.includes(":") && !s.startsWith("^"));
    const rows = bare.length ? await this.repo.findInstruments(bare) : [];
    const bseOnly = new Set(rows.filter((r) => r.exchange === "BSE").map((r) => r.symbol));
    return new Map(symbols.map((s) => [s, bseOnly.has(s) ? `${s}:BSE` : s]));
  }

  private async routeOne(symbol: string): Promise<string> {
    return (await this.route([symbol])).get(symbol) ?? symbol;
  }

  async quote(symbol: string): Promise<Quote> {
    const q = (await this.quotes([symbol])).get(symbol);
    if (!q) throw new NotFoundError(`Quote for ${symbol}`);
    return q;
  }

  /**
   * Instrument + primary (NSE) quote + events, and the BSE quote when asked.
   * Dual‑listed stocks trade at slightly different prices on each exchange;
   * we show NSE by default because that is where the volume is.
   */
  async stock(symbol: string, withBse = false): Promise<StockDetail> {
    const [instrument, quotes, events] = await Promise.all([
      this.instrument(symbol),
      this.quotes(withBse ? [symbol, `${symbol}:BSE`] : [symbol]),
      this.events(symbol),
    ]);
    const quote = quotes.get(symbol);
    if (!quote) throw new NotFoundError(`Quote for ${symbol}`);
    const bse = quotes.get(`${symbol}:BSE`);
    return { instrument, quote, events, bseQuote: bse ? { ...bse, symbol } : null };
  }

  async candles(symbol: string, range: CandleRange): Promise<{ candles: Candle[]; freshness: Freshness }> {
    const from = addDays(this.clock.now(), -RANGE_DAYS[range]);
    const raw = await this.data.getDailyCandles(await this.routeOne(symbol), from);
    return { candles: raw.map(toCandle), freshness: this.freshness(symbol, raw.at(-1)?.t ?? this.clock.now()) };
  }

  /** Raw candles for the engine — keeps Dates, avoids a serialise/parse round trip. */
  async dailyCandles(symbol: string, from: Date): Promise<RawCandle[]> {
    return this.data.getDailyCandles(await this.routeOne(symbol), from);
  }

  async events(symbol: string): Promise<InstrumentEvents> {
    const e = await this.data.getEvents(await this.routeOne(symbol));
    return {
      nextResultsAt: e.nextResultsAt?.toISOString() ?? null,
      lastResultsAt: e.lastResultsAt?.toISOString() ?? null,
      exDividendAt: e.exDividendAt?.toISOString() ?? null,
    };
  }

  freshness(symbol: string, asOf: Date): Freshness {
    return {
      asOf: asOf.toISOString(),
      delayedMinutes: this.data.delayMinutes,
      stale: this.data.isStale(symbol),
      source: this.data.name,
    };
  }

  private toQuote(q: RawQuote): Quote {
    const change = q.price - q.previousClose;
    return {
      symbol: q.symbol,
      price: q.price,
      previousClose: q.previousClose,
      open: q.open,
      dayHigh: q.dayHigh,
      dayLow: q.dayLow,
      volume: q.volume,
      averageVolume: q.averageVolume,
      change: round(change, 2),
      changePct: q.previousClose ? round((change / q.previousClose) * 100, 2) : 0,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow,
      freshness: this.freshness(q.symbol, q.asOf),
    };
  }
}

export const toInstrument = (row: InstrumentRow): Instrument => ({
  symbol: row.symbol,
  name: row.name,
  exchange: row.exchange as Instrument["exchange"],
  sector: row.sector,
});

const toCandle = (c: RawCandle): Candle => ({ t: c.t.toISOString(), o: c.o, h: c.h, l: c.l, c: c.c, v: c.v });

/**
 * What a person typing "vedanta" means: the company called Vedanta, not its
 * subsidiaries. Exact ticker, then a name that starts with the words typed,
 * then a ticker that does, then anything that merely contains them; shorter
 * names win ties because the parent is usually the shorter name.
 */
export function rankMatches(items: Instrument[], term: string): Instrument[] {
  const t = term.toLowerCase();
  const tier = (i: Instrument): number => {
    const sym = i.symbol.toLowerCase();
    const name = i.name.toLowerCase();
    if (sym === t) return 0;
    if (name === t || name.startsWith(`${t} `) || name.startsWith(`${t}(`)) return 1;
    if (name.startsWith(t)) return 2;
    if (sym.startsWith(t)) return 3;
    if (name.includes(t)) return 4;
    return 5;
  };
  return [...items].sort((a, b) => tier(a) - tier(b) || a.name.length - b.name.length);
}
