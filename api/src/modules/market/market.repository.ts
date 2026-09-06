import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { instruments, type InstrumentRow } from "../../db/schema.js";

export class MarketRepository {
  constructor(private readonly db: Db) {}

  findInstrument(symbol: string): Promise<InstrumentRow | undefined> {
    return this.db.query.instruments.findFirst({ where: and(eq(instruments.symbol, symbol), eq(instruments.active, true)) });
  }

  findInstruments(symbols: readonly string[]): Promise<InstrumentRow[]> {
    if (symbols.length === 0) return Promise.resolve([]);
    return this.db.query.instruments.findMany({ where: inArray(instruments.symbol, [...symbols]) });
  }

  /** Learned from search: new listings are added, names and sectors refreshed. */
  async upsertInstruments(rows: { symbol: string; name: string; exchange: "NSE" | "BSE"; sector: string | null }[]): Promise<void> {
    if (rows.length === 0) return;
    await this.db
      .insert(instruments)
      .values(rows.map((r) => ({ ...r, active: true })))
      .onConflictDoUpdate({ target: instruments.symbol, set: { name: sql`excluded.name`, sector: sql`coalesce(excluded.sector, ${instruments.sector})`, active: true } });
  }

  search(q: string, limit = 12): Promise<InstrumentRow[]> {
    const pattern = `%${q}%`;
    return this.db.query.instruments.findMany({
      where: and(eq(instruments.active, true), or(ilike(instruments.symbol, pattern), ilike(instruments.name, pattern))),
      limit,
      orderBy: instruments.symbol,
    });
  }
}
