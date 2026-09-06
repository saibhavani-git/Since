import type { KeyValueStore } from "../../lib/cache/index.js";
import type { Clock } from "../../lib/clock.js";
import { SingleFlight } from "../../lib/single-flight.js";
import type { EvidenceItem, EvidenceQuery, EvidenceResult, NewsProvider } from "./ports.js";

type Serialized = Omit<EvidenceItem, "publishedAt"> & { publishedAt: string };
interface Cached {
  items: Serialized[];
  partial: boolean;
}

/** A partial answer (one source failed) is kept only briefly so the next reader retries the failed source. */
const PARTIAL_TTL_SECONDS = 120;

/**
 * Evidence is per symbol and per day‑bucket, never per user, so everyone
 * watching a stock shares one upstream call per TTL. Window `from`
 * is bucketed to the hour so slightly different "since" instants still hit.
 */
export class CachedNewsProvider implements NewsProvider {
  readonly name: string;
  readonly enabled: boolean;
  private readonly flight = new SingleFlight();

  constructor(
    private readonly inner: NewsProvider,
    private readonly store: KeyValueStore,
    private readonly clock: Clock,
    private readonly ttlSeconds: number,
  ) {
    this.name = inner.name;
    this.enabled = inner.enabled;
  }

  async search(q: EvidenceQuery): Promise<EvidenceResult> {
    // One entry per symbol and window; the limit is applied on read so card (6) and report (10) share it.
    const key = `evidence:${this.inner.name}:${q.symbol}:${hourBucket(q.from)}`;
    const hit = await this.store.get<Cached>(key);
    if (hit) return { items: hit.items.map(revive).filter((i) => i.publishedAt <= q.to).slice(0, q.limit), partial: hit.partial };
    return this.flight.run(key, async () => {
      const result = await this.inner.search({ ...q, to: this.clock.now(), limit: MAX_STORED });
      await this.store.set<Cached>(key, { items: result.items.map(serialize), partial: result.partial }, result.partial ? PARTIAL_TTL_SECONDS : this.ttlSeconds);
      return { items: result.items.filter((i) => i.publishedAt <= q.to).slice(0, q.limit), partial: result.partial };
    });
  }
}

const MAX_STORED = 12;
const hourBucket = (d: Date): string => d.toISOString().slice(0, 13);
const serialize = (i: EvidenceItem): Serialized => ({ ...i, publishedAt: i.publishedAt.toISOString() });
const revive = (i: Serialized): EvidenceItem => ({ ...i, publishedAt: new Date(i.publishedAt) });
