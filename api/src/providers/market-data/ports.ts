/**
 * Port: market data. Three methods are enough for the whole
 * product. A broker integrating Since implements these against their feed.
 *
 * Symbols are plain NSE symbols (RELIANCE). The index is `NIFTY 50`.
 * Adapters own the mapping to vendor tickers.
 */
export interface MarketDataProvider {
  readonly name: string;
  /** Typical delay of this source in minutes, for the freshness label. */
  readonly delayMinutes: number;
  getQuotes(symbols: readonly string[]): Promise<Map<string, RawQuote>>;
  /** Daily candles from `from` (inclusive) to the latest session, oldest first. */
  getDailyCandles(symbol: string, from: Date): Promise<RawCandle[]>;
  getEvents(symbol: string): Promise<RawEvents>;
}

export interface RawQuote {
  symbol: string;
  price: number;
  previousClose: number;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  averageVolume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  /** When the source last updated this price. */
  asOf: Date;
}

export interface RawCandle {
  t: Date;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number | null;
}

export interface RawEvents {
  nextResultsAt: Date | null;
  lastResultsAt: Date | null;
  exDividendAt: Date | null;
}

/** Port: a small key/value cache with timestamps, used by the caching decorator. */
export interface MarketCache {
  get<T>(key: string): Promise<{ value: T; fetchedAt: Date } | null>;
  set<T>(key: string, value: T, fetchedAt: Date): Promise<void>;
}

export const INDEX_SYMBOL = "NIFTY 50";
