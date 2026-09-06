import { eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { marketCache } from "../../db/schema.js";
import type { MarketCache } from "./ports.js";

/** Cache rows in Postgres. Swap for Redis by implementing `MarketCache`. */
export class PostgresMarketCache implements MarketCache {
  constructor(private readonly db: Db) {}

  async get<T>(key: string): Promise<{ value: T; fetchedAt: Date } | null> {
    const row = await this.db.query.marketCache.findFirst({ where: eq(marketCache.key, key) });
    return row ? { value: row.payload as T, fetchedAt: row.fetchedAt } : null;
  }

  async set<T>(key: string, value: T, fetchedAt: Date): Promise<void> {
    await this.db
      .insert(marketCache)
      .values({ key, payload: value, fetchedAt })
      .onConflictDoUpdate({ target: marketCache.key, set: { payload: value, fetchedAt } });
  }
}
