import type { Env } from "../../config/env.js";
import type { Db } from "../../db/client.js";
import type { KeyValueStore } from "../../lib/cache/index.js";
import type { Clock } from "../../lib/clock.js";
import type { Logger } from "../../lib/logger.js";
import { CachedMarketDataProvider } from "./cached.provider.js";
import { FixtureMarketDataProvider } from "./fixture.provider.js";
import { PostgresMarketCache } from "./postgres.cache.js";
import type { MarketDataProvider } from "./ports.js";
import { StoreMarketCache, TieredMarketCache } from "./store.cache.js";
import { YahooMarketDataProvider } from "./yahoo.provider.js";

export type { MarketDataProvider, MarketCache, RawQuote, RawCandle, RawEvents } from "./ports.js";
export { INDEX_SYMBOL } from "./ports.js";
export { CachedMarketDataProvider } from "./cached.provider.js";
export { FixtureMarketDataProvider } from "./fixture.provider.js";
export { YahooInstrumentSearch, type InstrumentSearch, type InstrumentHit } from "./yahoo.search.js";

export interface MarketDataDeps {
  env: Env;
  db: Db;
  store: KeyValueStore;
  clock: Clock;
  log: Logger;
  /** Reference prices for the fixture provider, from the instrument universe. */
  basePrices: ReadonlyMap<string, number>;
}

/**
 * The one place a market data source is chosen. Always wrapped as
 * source → single‑flight + freshness (decorator) → L1 store → L2 Postgres.
 */
export function createMarketDataProvider(deps: MarketDataDeps): CachedMarketDataProvider {
  const source: MarketDataProvider =
    deps.env.MARKET_DATA_PROVIDER === "fixture"
      ? new FixtureMarketDataProvider(deps.clock, deps.basePrices)
      : new YahooMarketDataProvider();

  const cache = new TieredMarketCache([new StoreMarketCache(deps.store), new PostgresMarketCache(deps.db)]);

  return new CachedMarketDataProvider(
    source,
    cache,
    {
      quoteSeconds: deps.env.QUOTE_CACHE_TTL_SECONDS,
      candleSeconds: deps.env.CANDLE_CACHE_TTL_SECONDS,
      eventSeconds: 60 * 60 * 6,
    },
    deps.clock,
    deps.log,
  );
}
