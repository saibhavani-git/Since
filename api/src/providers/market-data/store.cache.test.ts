import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../lib/cache/memory.store.js";
import { FixedClock } from "../../lib/clock.js";
import type { MarketCache } from "./ports.js";
import { StoreMarketCache, TieredMarketCache } from "./store.cache.js";

class RecordingCache implements MarketCache {
  readonly data = new Map<string, { value: unknown; fetchedAt: Date }>();
  sets = 0;
  async get<T>(key: string) {
    const hit = this.data.get(key);
    return hit ? { value: hit.value as T, fetchedAt: hit.fetchedAt } : null;
  }
  async set<T>(key: string, value: T, fetchedAt: Date) {
    this.sets++;
    this.data.set(key, { value, fetchedAt });
  }
}

describe("StoreMarketCache", () => {
  it("keeps fetchedAt so the decorator can judge freshness itself", async () => {
    const cache = new StoreMarketCache(new MemoryStore(new FixedClock(new Date())));
    const at = new Date("2026-09-04T10:00:00Z");
    await cache.set("quote:TCS", { price: 1 }, at);
    const hit = await cache.get<{ price: number }>("quote:TCS");
    expect(hit?.value.price).toBe(1);
    expect(hit?.fetchedAt.toISOString()).toBe(at.toISOString());
  });
});

describe("TieredMarketCache", () => {
  it("reads through to the slower tier and backfills the faster one", async () => {
    const l1 = new RecordingCache();
    const l2 = new RecordingCache();
    const at = new Date();
    await l2.set("candles:INFY", [1, 2, 3], at);
    const tiered = new TieredMarketCache([l1, l2]);

    const hit = await tiered.get<number[]>("candles:INFY");
    expect(hit?.value).toEqual([1, 2, 3]);
    await new Promise((r) => setTimeout(r, 0)); // backfill is fire‑and‑forget
    expect(l1.data.has("candles:INFY")).toBe(true);
  });

  it("writes quotes only to the first tier, everything else to all tiers", async () => {
    const l1 = new RecordingCache();
    const l2 = new RecordingCache();
    const tiered = new TieredMarketCache([l1, l2]);
    await tiered.set("quote:TCS", { p: 1 }, new Date());
    await tiered.set("candles:TCS", [1], new Date());
    expect(l1.sets).toBe(2);
    expect(l2.sets).toBe(1);
    expect(l2.data.has("candles:TCS")).toBe(true);
    expect(l2.data.has("quote:TCS")).toBe(false);
  });
});
