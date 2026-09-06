import { UpstreamError } from "../../lib/errors.js";
import { complete, type EvidenceItem, type EvidenceQuery, type EvidenceResult, type NewsProvider } from "./ports.js";

interface BseRow {
  NEWSID: string;
  SCRIP_CD: number | string;
  NEWSSUB: string;
  HEADLINE: string | null;
  ATTACHMENTNAME: string | null;
  NEWS_DT: string;
  CATEGORYNAME: string | null;
  SUBCATNAME: string | null;
  SLONGNAME: string | null;
  NSURL: string | null;
}

/**
 * Official corporate announcements from BSE (results, board meetings, order
 * wins, pledges, bulk deals). Free, unofficial JSON used by bseindia.com
 * itself. The most trustworthy "why" we can show, so it ranks above news.
 */
export class BseFilingsProvider implements NewsProvider {
  readonly name = "bse";
  readonly enabled = true;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async search(q: EvidenceQuery): Promise<EvidenceResult> {
    if (!q.bseCode) return complete([]);
    const params = new URLSearchParams({
      pageno: "1",
      strCat: "-1",
      subcategory: "-1",
      strType: "C",
      strSearch: "P",
      strScrip: q.bseCode,
      strPrevDate: yyyymmdd(q.from),
      strToDate: yyyymmdd(q.to),
    });
    const res = await this.fetchImpl(`https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w?${params}`, {
      headers: {
        accept: "application/json",
        referer: "https://www.bseindia.com/",
        origin: "https://www.bseindia.com",
        // BSE's CDN rejects non‑browser agents outright.
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new UpstreamError("BSE filings are unavailable right now", { provider: this.name, status: res.status });
    const json = (await res.json()) as { Table?: BseRow[] };
    const items = (json.Table ?? [])
      .map((r) => this.toItem(r))
      .filter((i) => i.publishedAt >= q.from && i.publishedAt <= q.to)
      .filter((i) => !NOISE.test(`${i.title} ${i.category ?? ""}`))
      .slice(0, q.limit);
    return complete(items);
  }

  private toItem(r: BseRow): EvidenceItem {
    const head = clean(r.HEADLINE);
    const sub = clean(r.NEWSSUB);
    // Whichever field is not SEBI boilerplate is the title; the other is context.
    const [title, summary] = head && !BOILERPLATE.test(head) ? [head, sub] : sub && !BOILERPLATE.test(sub) ? [sub, head] : [head || sub || "Corporate announcement", null];
    const category = r.SUBCATNAME?.trim() || r.CATEGORYNAME?.trim() || null;
    const url = r.ATTACHMENTNAME
      ? `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${r.ATTACHMENTNAME}`
      : `https://www.bseindia.com/corporates/ann.html?scrip=${r.SCRIP_CD}`;
    return {
      id: `bse:${r.NEWSID}`,
      kind: "filing",
      title: title.length > 180 ? `${title.slice(0, 177)}…` : title,
      summary: summary && summary !== title ? summary : null,
      url,
      source: "BSE filing",
      // BSE returns IST wall‑clock without an offset.
      publishedAt: new Date(`${r.NEWS_DT.replace(" ", "T")}+05:30`),
      sourceUrl: "https://www.bseindia.com",
      sentiment: null,
      category,
      language: "en",
      salience: salienceOf(title, category),
    };
  }
}

const clean = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();

/** Never explains a price move; not worth a line. */
const NOISE = /trading window|newspaper publication|certificate under|compliance certificate|reg(ulation)? 74|reg(ulation)? 40\(9\)|loss of share certificate|duplicate share|investor grievance|shareholding pattern|allotment of esop|esop ?\/ ?esps|esg rating/i;
/** Says nothing by itself; the substance is in the PDF. */
const BOILERPLATE =
  /^(intimation|disclosure|announcement|submission|compliance|certificate)[^.]*regulation|^announcement under regulation 30|listing obligations and disclosure requirements|is attached\.?$|attached herewith|enclosed herewith|trading window|newspaper (publication|advertisement)|dispatch of (letter|notice)|record date|loss of share certificate|duplicate share|closure of trading|^(please )?(find|note) (attached|enclosed|that)/i;
/** Categories that usually move prices. */
const HIGH =
  /result|board meeting|acquisition|acquire|merger|demerger|amalgamation|combination|buyback|dividend|bonus|split|order|award|contract|fund raising|qip|preferential|rating|resignation|appointment|investor presentation|press release|media|stake|joint venture|partnership|agreement|launch|capex|expansion|guidance|clarification|penalty|fine|litigation|strike|plant|commission/i;

function salienceOf(title: string, category: string | null): number {
  const text = `${title} ${category ?? ""}`;
  if (HIGH.test(text)) return BOILERPLATE.test(title) ? 0.6 : 0.9;
  return BOILERPLATE.test(title) ? 0.2 : 0.5;
}

const yyyymmdd = (d: Date): string => {
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  return `${ist.getUTCFullYear()}${String(ist.getUTCMonth() + 1).padStart(2, "0")}${String(ist.getUTCDate()).padStart(2, "0")}`;
};
