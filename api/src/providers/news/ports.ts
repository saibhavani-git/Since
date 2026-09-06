/**
 * Port: evidence for "why did this move". Two kinds share one
 * shape: official exchange filings and press coverage. Adapters own vendor
 * ticker formats and auth; callers only see this.
 */
export interface NewsProvider {
  readonly name: string;
  readonly enabled: boolean;
  search(query: EvidenceQuery): Promise<EvidenceResult>;
}

export interface EvidenceResult {
  items: EvidenceItem[];
  /** True when at least one underlying source failed — callers cache this briefly, not for the full TTL. */
  partial: boolean;
}

export const complete = (items: EvidenceItem[]): EvidenceResult => ({ items, partial: false });

export interface EvidenceQuery {
  /** Our symbol, e.g. RELIANCE. */
  symbol: string;
  /** Company name, for adapters that search by text. */
  name: string;
  /** BSE scrip code when known; filings adapters need it. */
  bseCode: string | null;
  from: Date;
  to: Date;
  limit: number;
}

export type EvidenceKind = "filing" | "news";

export interface EvidenceItem {
  /** Stable across runs: `<provider>:<vendor id>`. */
  id: string;
  kind: EvidenceKind;
  title: string;
  summary: string | null;
  url: string;
  source: string;
  /** The publisher's site, for favicons and attribution; null when unknown. */
  sourceUrl: string | null;
  publishedAt: Date;
  /** −1…1 when the vendor scores it; filings are null. */
  sentiment: number | null;
  /** Filing category (e.g. "Result", "Board Meeting") or news topic when known. */
  category: string | null;
  language: string;
  /** 0…1: how likely this explains a price move. Boilerplate filings score low. */
  salience: number;
}
