import type { Db } from "../../db/client.js";
import { watchlistItems } from "../../db/schema.js";
import type { Clock } from "../../lib/clock.js";
import { addDays } from "../../lib/ist.js";
import type { Logger } from "../../lib/logger.js";
import { INDEX_SYMBOL } from "../../providers/market-data/index.js";
import type { NewsProvider } from "../../providers/news/index.js";
import { phaseAt } from "../market/calendar.js";
import { BSE_CODES } from "../market/instruments.js";
import type { MarketService } from "../market/market.service.js";

export interface PrewarmDeps {
  db: Db;
  market: MarketService;
  news: NewsProvider;
  clock: Clock;
  log: Logger;
}

/**
 * Keeps the shared cache warm for every symbol anyone watches, so
 * the request path is a cache read. Each method is idempotent and safe to
 * run from many workers at once — the cache decorators dedupe the work.
 */
export class PrewarmService {
  constructor(private readonly d: PrewarmDeps) {}

  /** Distinct symbols across all watchlists, plus the index. */
  async watchedSymbols(): Promise<string[]> {
    const rows = await this.d.db.selectDistinct({ symbol: watchlistItems.symbol }).from(watchlistItems);
    return [INDEX_SYMBOL, ...rows.map((r) => r.symbol)];
  }

  /** Cheap and frequent: one batched quote call per chunk. Skips when the market is shut. */
  async quotes(): Promise<{ symbols: number; skipped: boolean }> {
    if (phaseAt(this.d.clock.now()) !== "open") return { symbols: 0, skipped: true };
    const symbols = await this.watchedSymbols();
    for (const chunk of chunks(symbols, 50)) await this.d.market.quotes(chunk).catch((err) => this.d.log.warn({ err: String(err) }, "warm quotes failed"));
    return { symbols: symbols.length, skipped: false };
  }

  /** After the close: a year of candles and the events for every watched symbol. */
  async history(): Promise<{ symbols: number }> {
    const symbols = await this.watchedSymbols();
    const from = addDays(this.d.clock.now(), -400);
    await Promise.all(
      symbols.map((s) =>
        Promise.all([this.d.market.dailyCandles(s, from), s === INDEX_SYMBOL ? null : this.d.market.events(s)]).catch((err) =>
          this.d.log.warn({ err: String(err), symbol: s }, "warm history failed"),
        ),
      ),
    );
    return { symbols: symbols.length };
  }

  /** Evidence for the last week for every watched symbol; bucketed to the hour like the reader. */
  async evidence(): Promise<{ symbols: number; skipped: boolean }> {
    if (!this.d.news.enabled) return { symbols: 0, skipped: true };
    const now = this.d.clock.now();
    const from = new Date(Math.floor(addDays(now, -7).getTime() / 3_600_000) * 3_600_000);
    const symbols = (await this.watchedSymbols()).filter((s) => s !== INDEX_SYMBOL);
    const names = await this.d.market.instruments(symbols);
    for (const s of symbols) {
      await this.d.news
        .search({ symbol: s, name: names.get(s)?.name ?? s, bseCode: BSE_CODES[s] ?? null, from, to: now, limit: 6 })
        .catch((err) => this.d.log.warn({ err: String(err), symbol: s }, "warm evidence failed"));
    }
    return { symbols: symbols.length, skipped: false };
  }
}

const chunks = <T>(arr: T[], size: number): T[][] => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));
