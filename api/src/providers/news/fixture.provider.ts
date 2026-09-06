import { complete, type EvidenceItem, type EvidenceQuery, type EvidenceResult, type NewsProvider } from "./ports.js";

/** Deterministic evidence for tests and offline demos: one filing, one article, inside the window. */
export class FixtureNewsProvider implements NewsProvider {
  readonly name = "fixture";
  readonly enabled = true;

  async search(q: EvidenceQuery): Promise<EvidenceResult> {
    const mid = new Date((q.from.getTime() + q.to.getTime()) / 2);
    const items: EvidenceItem[] = [
      {
        id: `fixture:filing:${q.symbol}`,
        kind: "filing",
        title: `${q.name}: Outcome of board meeting — unaudited results for the quarter`,
        summary: "Revenue up 8% year on year; margin steady.",
        url: "https://www.bseindia.com/",
        source: "BSE filing",
        publishedAt: mid,
        sourceUrl: null,
        sentiment: null,
        category: "Result",
        language: "en",
        salience: 0.9,
      },
      {
        id: `fixture:news:${q.symbol}`,
        kind: "news",
        title: `${q.name} shares move after quarterly numbers beat street estimates`,
        summary: "Analysts raised targets after the results; brokerages flagged strong order book.",
        url: "https://example.com/news",
        source: "Fixture Business Daily",
        publishedAt: new Date(mid.getTime() + 3600_000),
        sourceUrl: null,
        sentiment: 0.4,
        category: null,
        language: "en",
        salience: 0.7,
      },
    ];
    return complete(items.slice(0, q.limit));
  }
}
