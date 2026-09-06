import type { DigestCard, QuietItem } from "@/lib/api/types";

/**
 * Representative data for the landing page. Static so the page renders
 * without the API; shaped exactly like real responses so the same components
 * render it.
 */

const sessions = ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03"];
const series = (closes: number[]) => closes.map((c, i) => ({ t: `${sessions[i]}T10:00:00Z`, c }));

/** Nifty closes over the same nine sessions, for the market-adjusted demo. */
export const niftySeries = series([24410, 24455, 24380, 24520, 24490, 24530, 24560, 24610, 24590]);

export const demoCard: DigestCard = {
  symbol: "RELIANCE",
  instrument: { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", sector: "Energy" },
  priceThen: 2758,
  priceNow: 2848,
  move: { totalPct: 3.26, marketPct: 0.41, stockPct: 2.85, beta: 1.02, indexSymbol: "NIFTY 50", indexPct: 0.4 },
  volatility: { dailySigmaPct: 1.1, moveInSigmas: 2.9 },
  volumeRatio: 1.8,
  headline: "Reliance rose 3.3% as the board approved a ₹15,000 crore buyback",
  why: "Reliance said its retail arm will list by March, and the board approved a ₹15,000 crore buyback [1]. Volume ran at 1.8× normal on the announcement day [2].",
  summary: "Reliance Industries rose from ₹2,758 to ₹2,848, a change of +3.3%, while Nifty 50 was up 0.4%. The board approved a ₹15,000 crore buyback and said Reliance Retail will list by March. Volume ran at 1.8× normal on the announcement day.",
  narration: "Since 1 September, Reliance Industries is up 3.3 percent, from 2,758 to 2,848 rupees. During this period, the board approved a 15,000 crore rupee buyback and said Reliance Retail will list by March, as the exchange filing shows. Moneycontrol reported volume at 1.8 times normal on the day. Nifty 50 rose 0.4 percent over the same window.",
  story: [
    { id: "r1", kind: "filing", at: "2026-09-02T09:30:00.000Z", title: "Board approves ₹15,000 crore buyback; Reliance Retail to list by March", detail: "The buyback is at ₹3,100 a share via tender offer. The retail listing follows the 2025 demerger.", source: "BSE filing", sourceUrl: "https://www.bseindia.com/", url: "https://www.bseindia.com/", price: 2790, dayChangePct: 0.9, tone: "up", weight: 0.95 },
    { id: "r2", kind: "news", at: "2026-09-02T13:05:00.000Z", title: "Reliance shares jump on buyback; volume 1.8× normal", detail: null, source: "Moneycontrol", sourceUrl: "https://www.moneycontrol.com/", url: "https://www.moneycontrol.com/", price: 2812, dayChangePct: 0.8, tone: "up", weight: 0.6 },
    { id: "r3", kind: "news", at: "2026-09-04T06:40:00.000Z", title: "Brokerages raise targets after buyback; Jefferies sees ₹3,200", detail: null, source: "The Economic Times", sourceUrl: "https://economictimes.indiatimes.com/", url: "https://economictimes.indiatimes.com/", price: 2848, dayChangePct: 1.3, tone: "up", weight: 0.5 },
  ],
  sources: [
    {
      id: "1",
      kind: "filing",
      title: "Outcome of Board Meeting — Buyback of equity shares and update on retail listing",
      url: "https://www.bseindia.com/",
      source: "BSE",
      publishedAt: "2026-09-02T11:20:00.000Z",
      category: "Board Meeting",
      sentiment: null,
    },
    {
      id: "2",
      kind: "news",
      title: "Reliance shares rally on buyback, retail IPO timeline",
      url: "https://www.moneycontrol.com/",
      source: "Moneycontrol",
      publishedAt: "2026-09-02T13:05:00.000Z",
      category: "Markets",
      sentiment: 0.4,
    },
  ],
  chips: [
    { label: "2.9σ move", tone: "rise" },
    { label: "1.8× volume", tone: "neutral" },
    { label: "Nifty +0.4%", tone: "market" },
  ],
  signals: [{ kind: "unusual_move", tier: 4, at: "2026-09-02T10:00:00.000Z", summary: "Moved 2.9 standard deviations", data: {} }],
  score: 0.82,
  series: series([2744, 2752, 2740, 2761, 2758, 2766, 2790, 2812, 2848]),
  sinceIndex: 4,
};

export const demoCardZomato: DigestCard = {
  symbol: "ZOMATO",
  instrument: { symbol: "ZOMATO", name: "Eternal (Zomato)", exchange: "NSE", sector: "Consumer Internet" },
  priceThen: 262,
  priceNow: 244.5,
  move: { totalPct: -6.68, marketPct: 0.52, stockPct: -7.2, beta: 1.3, indexSymbol: "NIFTY 50", indexPct: 0.4 },
  volatility: { dailySigmaPct: 2.4, moveInSigmas: 2.1 },
  volumeRatio: 2.6,
  headline: "Eternal fell 6.7% after Blinkit's loss widened to ₹287 crore",
  why: "Quarterly revenue rose 58% but Blinkit's loss widened to ₹287 crore, and the stock fell the morning after results [1]. You asked to be told when results landed.",
  summary: "Eternal fell from ₹262 to ₹244.5, a change of −6.7%, while Nifty 50 was up 0.4%. Quarterly revenue rose 58%, but Blinkit's loss widened to ₹287 crore and the stock fell the morning after results. You asked to be told when results landed.",
  narration: "Since 1 September, Eternal is down 6.7 percent, from 262 to 244 rupees 50. During this period, quarterly revenue rose 58 percent but Blinkit's loss widened to 287 crore rupees, as the exchange filing shows, and the stock fell the morning after results. Nifty 50 rose 0.4 percent over the same window.",
  story: [
    { id: "z1", kind: "filing", at: "2026-09-03T11:30:00.000Z", title: "Q1 results: revenue up 58%, Blinkit loss widens to ₹287 crore", detail: "Food delivery margin held at 4.2%. Quick commerce added 152 stores in the quarter.", source: "BSE filing", sourceUrl: "https://www.bseindia.com/", url: "https://www.bseindia.com/", price: 268, dayChangePct: 0.7, tone: "down", weight: 0.95 },
    { id: "z2", kind: "news", at: "2026-09-04T04:10:00.000Z", title: "Eternal slides 7% as Blinkit burn worries the street", detail: null, source: "Mint", sourceUrl: "https://www.livemint.com/", url: "https://www.livemint.com/", price: 248, dayChangePct: -7.5, tone: "down", weight: 0.6 },
  ],
  sources: [
    {
      id: "z1",
      kind: "filing",
      title: "Unaudited financial results for the quarter ended 30 June 2026",
      url: "https://www.bseindia.com/",
      source: "BSE",
      publishedAt: "2026-09-01T12:40:00.000Z",
      category: "Results",
      sentiment: null,
    },
  ],
  chips: [
    { label: "Results · your condition", tone: "iris" },
    { label: "2.6× volume", tone: "neutral" },
  ],
  signals: [{ kind: "thesis_results_landed", tier: 1, at: "2026-09-01T12:40:00.000Z", summary: "Results landed", data: {} }],
  score: 0.95,
  series: series([258, 260, 263, 261, 262, 266, 268, 248, 244.5]),
  sinceIndex: 4,
};

export const demoCardGroww: DigestCard = {
  symbol: "GROWW",
  instrument: { symbol: "GROWW", name: "Billionbrains Garage Ventures (Groww)", exchange: "NSE", sector: "Fintech" },
  priceThen: 189.04,
  priceNow: 194.5,
  move: { totalPct: 2.89, marketPct: -3.0, stockPct: 5.89, beta: 1.1, indexSymbol: "NIFTY 50", indexPct: -3.0 },
  volatility: { dailySigmaPct: 2.1, moveInSigmas: 1.4 },
  volumeRatio: 1.4,
  headline: "Groww rose 2.9% against a falling market as State Street took a 23% stake in its AMC",
  why: "State Street completed its investment in Groww AMC, taking a 23% stake [1]. A ₹2,500 crore block deal was accompanied by a 3% share fall, while Y Combinator separately sold nearly 1.2% of Groww [2].",
  summary:
    "State Street completed its investment in Groww AMC, taking a 23% stake. A ₹2,500 crore block deal was accompanied by a 3% share fall, while Y Combinator separately sold nearly 1.2% of Groww. These reports do not fully explain the gain across the window. Since 28 August, shares rose +2.9% from ₹189.04 to ₹194.50, against Nifty 50's −3.0%.",
  narration:
    "Since 28 August, Groww is up 2.9 percent, from 189 to 194 rupees 50, against a market that fell 3 percent. State Street completed its investment in Groww AMC, taking a 23 percent stake, and Y Combinator sold nearly 1.2 percent of the company.",
  story: [
    { id: "g1", kind: "news", at: "2026-09-01T18:44:00.000Z", title: "State Street completed its investment in Groww AMC, taking a 23% stake", detail: "The stake makes State Street the largest outside investor in the asset-management arm.", source: "The Times of India", sourceUrl: "https://timesofindia.indiatimes.com/", url: "https://timesofindia.indiatimes.com/", price: 196.8, dayChangePct: 4.1, tone: "up", weight: 0.9 },
    { id: "g2", kind: "news", at: "2026-09-02T07:20:00.000Z", title: "₹2,500 crore block deal in Groww; Y Combinator trims 1.2%", detail: null, source: "Moneycontrol", sourceUrl: "https://www.moneycontrol.com/", url: "https://www.moneycontrol.com/", price: 203.01, dayChangePct: 3.2, tone: "down", weight: 0.7 },
    { id: "g3", kind: "news", at: "2026-09-04T05:10:00.000Z", title: "Brokerages initiate coverage on Groww; targets range ₹210–₹240", detail: null, source: "The Economic Times", sourceUrl: "https://economictimes.indiatimes.com/", url: "https://economictimes.indiatimes.com/", price: 194.5, dayChangePct: -1.9, tone: "up", weight: 0.5 },
  ],
  sources: [
    { id: "g1", kind: "news", title: "State Street completes Groww AMC investment", url: "https://timesofindia.indiatimes.com/", source: "The Times of India", publishedAt: "2026-09-01T18:44:00.000Z", category: "Markets", sentiment: 0.3 },
    { id: "g2", kind: "news", title: "Block deal: ₹2,500 crore of Groww changes hands", url: "https://www.moneycontrol.com/", source: "Moneycontrol", publishedAt: "2026-09-02T07:20:00.000Z", category: "Markets", sentiment: -0.2 },
  ],
  chips: [
    { label: "1.4σ move", tone: "rise" },
    { label: "1.4× volume", tone: "neutral" },
    { label: "Nifty −3.0%", tone: "market" },
  ],
  signals: [{ kind: "unusual_move", tier: 4, at: "2026-09-02T10:00:00.000Z", summary: "Moved against the market", data: {} }],
  score: 0.78,
  series: series([186.2, 188.5, 191.1, 189.6, 189.04, 196.8, 203.01, 198.4, 194.5]),
  sinceIndex: 4,
};

export const demoCardSwiggy: DigestCard = {
  symbol: "SWIGGY",
  instrument: { symbol: "SWIGGY", name: "Swiggy", exchange: "NSE", sector: "Consumer Internet" },
  priceThen: 410.5,
  priceNow: 427.1,
  move: { totalPct: 4.04, marketPct: -3.0, stockPct: 7.04, beta: 1.2, indexSymbol: "NIFTY 50", indexPct: -3.0 },
  volatility: { dailySigmaPct: 2.3, moveInSigmas: 1.8 },
  volumeRatio: 1.9,
  headline: "Swiggy gained 4% after Instamart's losses narrowed faster than the street expected",
  why: "Quarterly results showed Instamart's contribution loss narrowing to 1.9% of GOV while food delivery margins held [1]. Two brokerages raised targets the next morning [2].",
  summary:
    "Swiggy rose from ₹410.50 to ₹427.10, a gain of +4.0% while Nifty 50 fell −3.0%. Quarterly results showed Instamart's loss narrowing to 1.9% of gross order value with food-delivery margins holding steady, and two brokerages raised their targets the morning after. Volume ran at 1.9× usual on results day.",
  narration:
    "Since 28 August, Swiggy is up 4 percent, from 410 to 427 rupees, while the market fell 3 percent. Instamart's losses narrowed faster than expected and two brokerages raised their targets the next morning.",
  story: [
    { id: "s1", kind: "filing", at: "2026-09-01T12:10:00.000Z", title: "Q1 results: Instamart loss narrows to 1.9% of GOV; food delivery margin holds", detail: "Gross order value grew 24% year on year. The company reiterated its quick-commerce breakeven target.", source: "BSE filing", sourceUrl: "https://www.bseindia.com/", url: "https://www.bseindia.com/", price: 418, dayChangePct: 1.8, tone: "up", weight: 0.95 },
    { id: "s2", kind: "news", at: "2026-09-02T04:30:00.000Z", title: "Brokerages raise Swiggy targets after results; see path to profitability", detail: null, source: "Mint", sourceUrl: "https://www.livemint.com/", url: "https://www.livemint.com/", price: 424, dayChangePct: 1.4, tone: "up", weight: 0.6 },
  ],
  sources: [
    { id: "s1", kind: "filing", title: "Unaudited financial results for the quarter ended 30 June 2026", url: "https://www.bseindia.com/", source: "BSE", publishedAt: "2026-09-01T12:10:00.000Z", category: "Results", sentiment: null },
    { id: "s2", kind: "news", title: "Swiggy rallies as Instamart burn slows", url: "https://www.livemint.com/", source: "Mint", publishedAt: "2026-09-02T04:30:00.000Z", category: "Markets", sentiment: 0.5 },
  ],
  chips: [
    { label: "1.8σ move", tone: "rise" },
    { label: "1.9× volume", tone: "neutral" },
    { label: "Nifty −3.0%", tone: "market" },
  ],
  signals: [{ kind: "unusual_move", tier: 4, at: "2026-09-01T12:10:00.000Z", summary: "Moved 1.8 standard deviations", data: {} }],
  score: 0.84,
  series: series([405.2, 411.4, 408.1, 415.3, 410.5, 418.0, 424.2, 429.9, 427.1]),
  sinceIndex: 4,
};

export const demoCardNykaa: DigestCard = {
  symbol: "NYKAA",
  instrument: { symbol: "NYKAA", name: "FSN E-Commerce (Nykaa)", exchange: "NSE", sector: "Retail" },
  priceThen: 220.4,
  priceNow: 207.3,
  move: { totalPct: -5.94, marketPct: -3.0, stockPct: -2.94, beta: 1.1, indexSymbol: "NIFTY 50", indexPct: -3.0 },
  volatility: { dailySigmaPct: 2.0, moveInSigmas: 1.7 },
  volumeRatio: 1.6,
  summary:
    "Nykaa fell from ₹220.40 to ₹207.30, a change of −5.9%, with Nifty 50 down −3.0% over the same window. Beauty growth slowed to 18% in the quarterly update and the fashion segment stayed loss-making, so roughly half the fall tracks the market and half is the stock. No exchange filing beyond the business update landed in this window.",
  narration:
    "Since 28 August, Nykaa is down 5.9 percent, from 220 to 207 rupees, with the market down 3 percent. Beauty growth slowed to 18 percent in the quarterly update and fashion stayed loss-making.",
  headline: "Nykaa slid 5.9% as beauty growth slowed to 18% in its quarterly update",
  why: "The quarterly business update showed beauty GMV growth slowing to 18% and continued losses in fashion [1].",
  story: [
    { id: "n1", kind: "filing", at: "2026-09-02T13:40:00.000Z", title: "Quarterly business update: beauty GMV up 18%, fashion still loss-making", detail: "Beauty growth was 24% in the previous quarter. Management kept full-year guidance unchanged.", source: "BSE filing", sourceUrl: "https://www.bseindia.com/", url: "https://www.bseindia.com/", price: 211.2, dayChangePct: -2.9, tone: "down", weight: 0.9 },
    { id: "n2", kind: "news", at: "2026-09-03T06:15:00.000Z", title: "Nykaa slips as beauty growth cools; analysts split on valuation", detail: null, source: "Business Standard", sourceUrl: "https://www.business-standard.com/", url: "https://www.business-standard.com/", price: 208.8, dayChangePct: -1.1, tone: "down", weight: 0.55 },
  ],
  sources: [
    { id: "n1", kind: "filing", title: "Business update for the quarter ended 30 June 2026", url: "https://www.bseindia.com/", source: "BSE", publishedAt: "2026-09-02T13:40:00.000Z", category: "Updates", sentiment: null },
  ],
  chips: [
    { label: "1.7σ move", tone: "fall" },
    { label: "1.6× volume", tone: "neutral" },
    { label: "Nifty −3.0%", tone: "market" },
  ],
  signals: [{ kind: "unusual_move", tier: 4, at: "2026-09-02T13:40:00.000Z", summary: "Moved 1.7 standard deviations", data: {} }],
  score: 0.71,
  series: series([219.0, 217.5, 221.2, 218.4, 220.4, 214.9, 211.2, 208.8, 207.3]),
  sinceIndex: 4,
};

/** The ISO instant the demo cards count from — sessions[4], where sinceIndex points. */
export const demoSince = "2026-08-28T10:00:00Z";

export const demoQuiet: QuietItem[] = [
  { symbol: "HDFCBANK", name: "HDFC Bank", priceNow: 1642, changePct: 0.6, moveInSigmas: 0.4, sparkline: [1631, 1634, 1628, 1636, 1640, 1642], note: null },
  { symbol: "TCS", name: "Tata Consultancy Services", priceNow: 3912, changePct: -0.3, moveInSigmas: 0.2, sparkline: [3924, 3918, 3930, 3908, 3915, 3912], note: { title: "TCS wins multi-year deal with a European insurer", source: "Business Standard", sourceUrl: "https://www.business-standard.com/", url: "https://www.business-standard.com/", at: "2026-09-03T08:00:00.000Z" } },
  { symbol: "INFY", name: "Infosys", priceNow: 1518, changePct: 0.2, moveInSigmas: 0.1, sparkline: [1515, 1512, 1520, 1516, 1519, 1518], note: null },
];
