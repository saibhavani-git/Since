import type { KeyValueStore } from "../../lib/cache/index.js";

/** A listed company as the search returns it: our symbol, its name, where it trades. */
export interface InstrumentHit {
  symbol: string;
  name: string;
  exchange: "NSE" | "BSE";
  sector: string | null;
}

export interface InstrumentSearch {
  search(q: string): Promise<InstrumentHit[]>;
}

/**
 * Every NSE and BSE listing, by name or ticker, from Yahoo's search index —
 * the same source we quote from, so anything found here can be priced.
 * Dual listings collapse to one NSE symbol; BSE‑only names keep BSE.
 * Results are cached a day: the universe does not change by the minute.
 */
export class YahooInstrumentSearch implements InstrumentSearch {
  constructor(
    private readonly store: KeyValueStore,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async search(q: string): Promise<InstrumentHit[]> {
    const key = `isearch:${q.trim().toLowerCase()}`;
    const hit = await this.store.get<{ v: InstrumentHit[] }>(key);
    if (hit) return hit.v;
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0&listsCount=0&enableFuzzyQuery=true`;
    const res = await this.fetchImpl(url, { headers: { "user-agent": "Mozilla/5.0 (since)" }, signal: AbortSignal.timeout(6_000) });
    if (!res.ok) return [];
    const json = (await res.json()) as { quotes?: YahooQuote[] };
    const out = collapse(json.quotes ?? []);
    await this.store.set(key, { v: out }, 24 * 3600);
    return out;
  }
}

interface YahooQuote {
  symbol: string;
  longname?: string;
  shortname?: string;
  exchange?: string;
  quoteType?: string;
  sector?: string;
  industry?: string;
}

function collapse(quotes: YahooQuote[]): InstrumentHit[] {
  const bySymbol = new Map<string, InstrumentHit>();
  for (const q of quotes) {
    if (q.quoteType !== "EQUITY") continue;
    const isNse = q.symbol.endsWith(".NS");
    const isBse = q.symbol.endsWith(".BO");
    if (!isNse && !isBse) continue;
    const base = q.symbol.slice(0, -3).replace("%26", "&");
    if (/-(BL|BE|BZ|SM|ST|E\d|RE|W\d|PP)$/.test(base)) continue; // NSE trade-series variants are not separate companies
    const name = (q.longname || q.shortname || base).replace(/\s+(limited|ltd\.?)$/i, "").trim();
    const prev = bySymbol.get(base);
    if (prev?.exchange === "NSE") continue; // NSE listing already wins
    bySymbol.set(base, { symbol: base, name, exchange: isNse ? "NSE" : "BSE", sector: q.sector ?? q.industry ?? null });
  }
  return [...bySymbol.values()];
}
