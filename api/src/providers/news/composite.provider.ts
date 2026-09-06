import type { Logger } from "../../lib/logger.js";
import type { EvidenceItem, EvidenceQuery, EvidenceResult, NewsProvider } from "./ports.js";

/**
 * Fan out to every source, tolerate any one failing, merge and rank:
 * filings before news, then newest first, near‑duplicate titles collapsed.
 */
export class CompositeNewsProvider implements NewsProvider {
  readonly name: string;
  readonly enabled: boolean;

  constructor(
    private readonly sources: readonly NewsProvider[],
    private readonly log: Logger,
  ) {
    const on = sources.filter((s) => s.enabled);
    this.name = on.map((s) => s.name).join("+") || "none";
    this.enabled = on.length > 0;
  }

  async search(q: EvidenceQuery): Promise<EvidenceResult> {
    const active = this.sources.filter((s) => s.enabled);
    const results = await Promise.allSettled(active.map((s) => s.search(q)));
    const items: EvidenceItem[] = [];
    let partial = false;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        items.push(...r.value.items);
        partial ||= r.value.partial;
      } else {
        partial = true;
        this.log.warn({ provider: active[i]?.name, err: String(r.reason?.message ?? r.reason) }, "evidence source failed");
      }
    });
    return { items: rank(dedupe(items)).slice(0, q.limit), partial };
  }
}

/** Salient filings → salient news → the rest; ties by recency. */
const rank = (items: EvidenceItem[]): EvidenceItem[] =>
  items.sort((a, b) => {
    const wa = (a.kind === "filing" ? 0.15 : 0) + a.salience;
    const wb = (b.kind === "filing" ? 0.15 : 0) + b.salience;
    return wb - wa || b.publishedAt.getTime() - a.publishedAt.getTime();
  });

/**
 * Two passes: exact id (the same article can appear twice in one feed, and
 * ids become React keys downstream), then near-duplicate titles (the same
 * story syndicated across publishers).
 */
function dedupe(items: EvidenceItem[]): EvidenceItem[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  return items.filter((i) => {
    const title = i.title.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g, " ").trim().slice(0, 60);
    if (seenIds.has(i.id) || seenTitles.has(title)) return false;
    seenIds.add(i.id);
    seenTitles.add(title);
    return true;
  });
}
