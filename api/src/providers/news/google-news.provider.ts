import { UpstreamError } from "../../lib/errors.js";
import { displayName } from "../../lib/format.js";
import { mentions, publisherName, trusted } from "./relevance.js";
import { complete, type EvidenceItem, type EvidenceQuery, type EvidenceResult, type NewsProvider } from "./ports.js";

/**
 * Google News RSS, India edition. Free, no key, and it carries the papers an
 * Indian investor actually reads — Economic Times, Moneycontrol, Mint,
 * Business Standard, BusinessLine, CNBC-TV18. Ticker-tagged feeds miss most
 * of this coverage; this is where the "what happened" comes from. The cache
 * in front keeps us to one fetch per stock per window.
 */
export class GoogleNewsRssProvider implements NewsProvider {
  readonly name = "google-news";
  readonly enabled = true;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async search(q: EvidenceQuery): Promise<EvidenceResult> {
    const days = Math.min(30, Math.max(1, Math.ceil((q.to.getTime() - q.from.getTime()) / 86_400_000) + 1));
    const name = displayName(q.name);
    // Do not require market words: product launches, court orders, leadership
    // changes and regulation often matter before a headline says "shares".
    // Search both the public company name and ticker, then enforce relevance
    // on every returned headline below.
    const query = `("${name}" OR "${q.symbol}") when:${days}d`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const res = await this.fetchImpl(url, { signal: AbortSignal.timeout(10_000), headers: { "user-agent": "since/1.0 (+https://since.app)" } });
    if (!res.ok) throw new UpstreamError("News is unavailable right now", { provider: this.name, status: res.status });
    const xml = await res.text();
    const items = parseRss(xml)
      .map((r) => toEvidence(r, name, q.symbol))
      .filter((e): e is EvidenceItem => e !== null && e.publishedAt >= q.from && e.publishedAt <= q.to);
    // Google sometimes lists the same article (same guid) more than once.
    const unique = [...new Map(items.map((e) => [e.id, e])).values()];
    return complete(unique);
  }
}

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  guid: string;
  source: string;
  sourceUrl: string;
}

/** RSS 2.0 from Google is flat and predictable; a real XML parser would be a dependency for nothing. */
export function parseRss(xml: string): RssItem[] {
  const out: RssItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const body = m[1]!;
    const tag = (t: string): string => decode((new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`).exec(body)?.[1] ?? "").replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1").trim());
    const src = /<source url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/.exec(body);
    out.push({ title: tag("title"), link: tag("link"), pubDate: tag("pubDate"), guid: tag("guid"), source: decode(src?.[2] ?? ""), sourceUrl: decode(src?.[1] ?? "") });
  }
  return out;
}

/** Social feeds and aggregators are noise, never news. */
const NOISE_HOSTS = /facebook\.com|linkedin\.com|youtube\.com|twitter\.com|x\.com|instagram\.com|reddit\.com|threads\.net|pinterest\./i;
/** Listicles and market wraps mention everyone; they explain nothing about this stock. */
const LISTICLE =
  /stocks? to (buy|watch|track)|top \d+|\d+ (stocks|shares|key points|important points|things|points)|hot stocks|buzzing stocks|stocks in (focus|news)|market (wrap|live|highlights|today)|sensex|nifty (today|ends|closes|opens)|trade setup|closing bell|opening bell|which is (a )?better|\bvs\.?\b|comparison|should you (buy|sell|hold)|explained\b|\?|model portfolio|fresh targets|these (utility |it |bank |pharma |auto )?(stocks|shares)|crashed?:/i;
/** Words that mean something happened to this company. */
const EVENTFUL = /result|profit|revenue|q[1-4]|quarter|order|contract|deal|acquisition|acquire|stake|ipo|merger|demerger|buyback|dividend|bonus|split|upgrade|downgrade|target|rating|guidance|launch|plant|capex|expansion|approval|sebi|rbi|penalty|probe|resign|appoint|ceo|md|block deal|promoter|fpo|qip|debt|rights issue|record high|52-week|all-time/i;

function toEvidence(r: RssItem, name: string, symbol: string): EvidenceItem | null {
  if (!r.title || !r.link) return null;
  if (NOISE_HOSTS.test(r.sourceUrl) || NOISE_HOSTS.test(r.link)) return null;
  // Google appends " - Publisher" to every title.
  const title = r.title.replace(new RegExp(`\\s+-\\s+${escape(r.source)}\\s*$`, "i"), "").replace(/\s+-\s+[^-]{2,40}$/, "").trim();
  const publishedAt = new Date(r.pubDate);
  if (Number.isNaN(publishedAt.getTime())) return null;
  if (!mentions(title, name, symbol)) return null; // Google matched on the body; the headline is about something else
  let salience = trusted(r.source) ? 0.65 : 0.5;
  if (EVENTFUL.test(title)) salience += 0.2;
  if (LISTICLE.test(title) || (title.match(/,/g) ?? []).length >= 3) salience = 0.3; // round-ups name everyone
  return {
    id: `gnews:${r.guid || r.link}`,
    kind: "news",
    title,
    summary: null,
    url: r.link,
    source: publisherName(r.source || hostOf(r.sourceUrl || r.link)),
    publishedAt,
    sourceUrl: r.sourceUrl || null,
    sentiment: null,
    category: null,
    language: "en",
    salience: Math.min(1, salience),
  };
}

const hostOf = (u: string): string => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "news";
  }
};

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s: string): string =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
