/** Shared judgement about press: who is worth attributing to, and whether a headline is about this company at all. */

/** Papers a reader recognises. When several report one event, attribute it to one of these. */
const TRUSTED =
  /economic times|moneycontrol|mint|livemint|business standard|businessline|hindu businessline|cnbc|ndtv|reuters|bloomberg|financial express|times of india|the hindu|fortune india|zee business|news18|business today|outlook business|indian express|hindustan times|pti|ani|bse|nse/i;
export const trusted = (source: string): boolean => TRUSTED.test(source);

/** Does a headline actually talk about this company? Name, symbol, or the initials people use (SBI, HDFC, ITC). */
export function mentions(title: string, name: string, symbol: string): boolean {
  const short = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const alias = /\(([^)]+)\)/.exec(name)?.[1];
  const initials = short.split(/\s+/).filter((w) => !/^(of|and|the|&)$/i.test(w)).map((w) => w[0]).join("");
  const words = short.split(/\s+/).filter((w) => w.length >= 4 && !/^(bank|india|indian|industries|limited|ltd|company|corporation|services|state|national|enterprises|technologies|financial|finance)$/i.test(w));
  const t = title.toLowerCase();
  const phrase = [short, alias, ...words].filter((x): x is string => !!x).some((x) => t.includes(x.toLowerCase()));
  const identifiers = [symbol, initials.length >= 3 ? initials : null].filter((x): x is string => !!x);
  return phrase || identifiers.some((id) => new RegExp(`(^|[^a-z0-9])${escape(id.toLowerCase())}(?=$|[^a-z0-9])`, "i").test(t));
}

const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Vendors hand us domains; readers know names. */
const PUBLISHERS: [RegExp, string][] = [
  [/economictimes|economic times/i, "The Economic Times"],
  [/moneycontrol/i, "Moneycontrol"],
  [/livemint|^mint$/i, "Mint"],
  [/business-standard|business standard/i, "Business Standard"],
  [/thehindubusinessline|businessline/i, "BusinessLine"],
  [/cnbctv18|cnbc/i, "CNBC-TV18"],
  [/ndtvprofit|ndtv profit/i, "NDTV Profit"],
  [/ndtv/i, "NDTV"],
  [/reuters/i, "Reuters"],
  [/bloomberg/i, "Bloomberg"],
  [/financialexpress|financial express/i, "Financial Express"],
  [/timesofindia|times of india/i, "The Times of India"],
  [/thehindu\.com|^the hindu$/i, "The Hindu"],
  [/fortuneindia/i, "Fortune India"],
  [/zeebiz|zee business/i, "Zee Business"],
  [/news18/i, "News18"],
  [/businesstoday|business today/i, "Business Today"],
  [/indianexpress|indian express/i, "The Indian Express"],
  [/hindustantimes|hindustan times/i, "Hindustan Times"],
  [/bseindia/i, "BSE"],
  [/nseindia/i, "NSE"],
];
export function publisherName(source: string): string {
  const hit = PUBLISHERS.find(([re]) => re.test(source));
  if (hit) return hit[1];
  // "www.example.com" → "Example"
  const bare = source.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\.(com|in|co\.in|net|org|io|trade|news)$/i, "");
  return /[./]/.test(bare) ? bare : bare.charAt(0).toUpperCase() + bare.slice(1);
}
