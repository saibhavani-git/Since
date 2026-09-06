import type { KeyValueStore } from "../../lib/cache/index.js";
import type { MarketCache } from "./ports.js";

interface Envelope<T> {
  value: T;
  fetchedAt: string;
}

/**
 * `MarketCache` over any `KeyValueStore` (Redis in deployment). The store TTL
 * is long on purpose: freshness is judged by `fetchedAt` in the decorator, so
 * a week‑old value can still be served stale‑on‑error when upstream is down.
 */
export class StoreMarketCache implements MarketCache {
  constructor(
    private readonly store: KeyValueStore,
    private readonly retainSeconds = 7 * 24 * 3600,
    private readonly namespace = "md:",
  ) {}

  async get<T>(key: string): Promise<{ value: T; fetchedAt: Date } | null> {
    const hit = await this.store.get<Envelope<T>>(this.namespace + key);
    return hit ? { value: hit.value, fetchedAt: new Date(hit.fetchedAt) } : null;
  }

  async set<T>(key: string, value: T, fetchedAt: Date): Promise<void> {
    await this.store.set<Envelope<T>>(this.namespace + key, { value, fetchedAt: fetchedAt.toISOString() }, this.retainSeconds);
  }
}

/**
 * L1 → L2 read‑through. Reads try tiers in order and backfill the
 * faster tier on a lower hit; writes go to every tier. Quotes are only kept
 * in the first tier — they churn too fast to be worth a disk write.
 */
export class TieredMarketCache implements MarketCache {
  constructor(private readonly tiers: readonly MarketCache[]) {}

  async get<T>(key: string): Promise<{ value: T; fetchedAt: Date } | null> {
    for (let i = 0; i < this.tiers.length; i++) {
      const hit = await this.tiers[i]!.get<T>(key);
      if (hit) {
        for (let j = 0; j < i; j++) void this.tiers[j]!.set(key, hit.value, hit.fetchedAt);
        return hit;
      }
    }
    return null;
  }

  async set<T>(key: string, value: T, fetchedAt: Date): Promise<void> {
    const durable = !key.startsWith("quote:");
    await Promise.all(this.tiers.map((t, i) => (i === 0 || durable ? t.set(key, value, fetchedAt) : Promise.resolve())));
  }
}
