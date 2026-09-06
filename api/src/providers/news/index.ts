import type { Env } from "../../config/env.js";
import type { KeyValueStore } from "../../lib/cache/index.js";
import type { Clock } from "../../lib/clock.js";
import type { Logger } from "../../lib/logger.js";
import { BseFilingsProvider } from "./bse-filings.provider.js";
import { CachedNewsProvider } from "./cached.provider.js";
import { CompositeNewsProvider } from "./composite.provider.js";
import { FixtureNewsProvider } from "./fixture.provider.js";
import { GoogleNewsRssProvider } from "./google-news.provider.js";
import type { NewsProvider } from "./ports.js";

export type { NewsProvider, EvidenceItem, EvidenceQuery, EvidenceKind, EvidenceResult } from "./ports.js";

/**
 * The one place evidence sources are chosen:
 * filings (BSE, free) + press (Google News RSS, free) → composite → cache.
 */
export function createNewsProvider(env: Env, store: KeyValueStore, clock: Clock, log: Logger): NewsProvider {
  if (env.NEWS_PROVIDER === "fixture") return new CachedNewsProvider(new FixtureNewsProvider(), store, clock, 60);

  const sources: NewsProvider[] = [];
  if (env.NEWS_PROVIDER === "live") {
    if (env.FILINGS_BSE) sources.push(new BseFilingsProvider());
    if (env.NEWS_GOOGLE) sources.push(new GoogleNewsRssProvider());
  }
  const composite = new CompositeNewsProvider(sources, log);
  return new CachedNewsProvider(composite, store, clock, env.EVIDENCE_CACHE_TTL_SECONDS);
}
