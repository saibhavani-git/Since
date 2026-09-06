import YahooFinance from "yahoo-finance2";
import { UpstreamError } from "../../lib/errors.js";
import { INDEX_SYMBOL, type MarketDataProvider, type RawCandle, type RawEvents, type RawQuote } from "./ports.js";

/** Delayed, unofficial, free. Fine for development; a broker would swap in their feed. */
export class YahooMarketDataProvider implements MarketDataProvider {
  readonly name = "yahoo";
  readonly delayMinutes = 15;
  private readonly yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

  async getQuotes(symbols: readonly string[]): Promise<Map<string, RawQuote>> {
    if (symbols.length === 0) return new Map();
    const tickers = symbols.map(toTicker);
    let rows: Awaited<ReturnType<typeof this.yf.quote>>[];
    try {
      const result = await this.yf.quote(tickers);
      rows = Array.isArray(result) ? result : [result];
    } catch (err) {
      throw new UpstreamError("Quotes are unavailable right now", { provider: this.name, cause: String(err) });
    }

    const out = new Map<string, RawQuote>();
    for (const q of rows) {
      if (!q?.symbol || q.regularMarketPrice == null || q.regularMarketPreviousClose == null) continue;
      out.set(fromTicker(q.symbol), {
        symbol: fromTicker(q.symbol),
        price: q.regularMarketPrice,
        previousClose: q.regularMarketPreviousClose,
        open: q.regularMarketOpen ?? null,
        dayHigh: q.regularMarketDayHigh ?? null,
        dayLow: q.regularMarketDayLow ?? null,
        volume: q.regularMarketVolume ?? null,
        averageVolume: q.averageDailyVolume3Month ?? null,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
        asOf: q.regularMarketTime ? new Date(q.regularMarketTime) : new Date(),
      });
    }
    return out;
  }

  async getDailyCandles(symbol: string, from: Date): Promise<RawCandle[]> {
    try {
      const chart = await this.yf.chart(toTicker(symbol), { period1: from, interval: "1d" });
      return chart.quotes
        .filter((c) => c.close != null && c.open != null && c.high != null && c.low != null)
        .map((c) => ({
          t: new Date(c.date),
          o: c.open as number,
          h: c.high as number,
          l: c.low as number,
          c: c.close as number,
          v: c.volume ?? null,
        }));
    } catch (err) {
      throw new UpstreamError("Price history is unavailable right now", { provider: this.name, symbol, cause: String(err) });
    }
  }

  async getEvents(symbol: string): Promise<RawEvents> {
    if (symbol === INDEX_SYMBOL) return { nextResultsAt: null, lastResultsAt: null, exDividendAt: null };
    try {
      const q = await this.yf.quote(toTicker(symbol));
      const earnings = q.earningsTimestamp ? new Date(q.earningsTimestamp) : null;
      const now = Date.now();
      return {
        nextResultsAt: earnings && earnings.getTime() >= now ? earnings : null,
        lastResultsAt: earnings && earnings.getTime() < now ? earnings : null,
        exDividendAt: q.dividendDate ? new Date(q.dividendDate) : null,
      };
    } catch {
      // Events are enrichment, not truth. Missing events must never fail a digest.
      return { nextResultsAt: null, lastResultsAt: null, exDividendAt: null };
    }
  }
}

/**
 * Our symbols are exchange‑qualified only when not NSE: `RELIANCE` is NSE,
 * `RELIANCE:BSE` is the BSE listing. Yahoo uses `.NS` / `.BO` suffixes.
 */
const toTicker = (symbol: string): string => {
  if (symbol === INDEX_SYMBOL) return "^NSEI";
  if (symbol === "SENSEX") return "^BSESN";
  const [base, exchange] = symbol.split(":");
  return `${base!.replace("&", "%26")}${exchange === "BSE" ? ".BO" : ".NS"}`;
};
const fromTicker = (ticker: string): string => {
  if (ticker === "^NSEI") return INDEX_SYMBOL;
  if (ticker === "^BSESN") return "SENSEX";
  const base = ticker.replace(/\.(NS|BO)$/, "").replace("%26", "&");
  return ticker.endsWith(".BO") ? `${base}:BSE` : base;
};
