import type { DigestCard, Instrument } from "@/lib/api/types";
import { demoCard, demoCardZomato, niftySeries } from "./demo-data";

/** A dozen names people actually search for. Enough for the demo to feel real. */
export const DEMO_STOCKS: Instrument[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", sector: "Energy" },
  { symbol: "ZOMATO", name: "Eternal (Zomato)", exchange: "NSE", sector: "Consumer Internet" },
  { symbol: "HDFCBANK", name: "HDFC Bank", exchange: "NSE", sector: "Banks" },
  { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", sector: "IT Services" },
  { symbol: "INFY", name: "Infosys", exchange: "NSE", sector: "IT Services" },
  { symbol: "TATAMOTORS", name: "Tata Motors", exchange: "NSE", sector: "Autos" },
  { symbol: "ITC", name: "ITC", exchange: "NSE", sector: "FMCG" },
  { symbol: "SBIN", name: "State Bank of India", exchange: "NSE", sector: "Banks" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", exchange: "NSE", sector: "NBFC" },
  { symbol: "ADANIENT", name: "Adani Enterprises", exchange: "NSE", sector: "Conglomerate" },
  { symbol: "IRCTC", name: "IRCTC", exchange: "NSE", sector: "Travel" },
  { symbol: "PAYTM", name: "One 97 (Paytm)", exchange: "NSE", sector: "Fintech" },
  { symbol: "SUZLON", name: "Suzlon Energy", exchange: "NSE", sector: "Renewables" },
  { symbol: "DMART", name: "Avenue Supermarts (DMart)", exchange: "NSE", sector: "Retail" },
];

export function searchDemo(q: string): Instrument[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return DEMO_STOCKS.filter((s) => s.symbol.toLowerCase().includes(t) || s.name.toLowerCase().includes(t)).slice(0, 5);
}

const basePrice: Record<string, number> = {
  HDFCBANK: 1642, TCS: 3912, INFY: 1518, TATAMOTORS: 1042, ITC: 468, SBIN: 812, BAJFINANCE: 7120, ADANIENT: 3005, IRCTC: 905, PAYTM: 412, SUZLON: 58.4, DMART: 4210,
};

const whyFor: Record<string, { why: string; kind: "filing" | "news"; title: string; source: string } | null> = {
  TATAMOTORS: { why: "JLR reported wholesale volumes up 9% for the quarter, and the stock moved with it [1].", kind: "filing", title: "Press release — JLR wholesale volumes, Q1 FY27", source: "BSE" },
  SBIN: { why: "The RBI held rates and bank stocks drifted with the index; nothing specific to SBI on record [1].", kind: "news", title: "RBI holds repo rate; bank stocks flat", source: "Mint" },
  SUZLON: { why: "Suzlon announced a 300 MW order from a renewables developer, its third this quarter [1].", kind: "filing", title: "Intimation of order win — 300 MW", source: "BSE" },
};

/**
 * A plausible card for any demo stock. Deterministic per symbol so the same
 * search always tells the same story. Real cards come from the API.
 */
export function buildDemoCard(instrument: Instrument): DigestCard {
  if (instrument.symbol === "RELIANCE") return demoCard;
  if (instrument.symbol === "ZOMATO") return demoCardZomato;

  let seed = [...instrument.symbol].reduce((a, c) => a + c.charCodeAt(0), 0);
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280) * 2 - 1;
  const p0 = basePrice[instrument.symbol] ?? 1000;
  const closes: number[] = [];
  let p = p0;
  for (let i = 0; i < 9; i++) {
    p *= 1 + rnd() * 0.012 + (i > 4 ? rnd() * 0.02 : 0);
    closes.push(Math.round(p * 100) / 100);
  }
  const series = closes.map((c, i) => ({ t: niftySeries[i]!.t, c }));
  const sinceIndex = 4;
  const then = closes[sinceIndex]!;
  const now = closes[8]!;
  const totalPct = ((now - then) / then) * 100;
  const marketPct = ((niftySeries[8]!.c - niftySeries[sinceIndex]!.c) / niftySeries[sinceIndex]!.c) * 100;
  const stockPct = totalPct - marketPct;
  const sig = Math.abs(totalPct) / 1.4;
  const dir = totalPct >= 0 ? "Up" : "Down";
  const evidence = whyFor[instrument.symbol] ?? null;

  return {
    symbol: instrument.symbol,
    instrument,
    priceThen: then,
    priceNow: now,
    move: { totalPct, marketPct, stockPct, beta: 1, indexSymbol: "NIFTY 50", indexPct: marketPct },
    volatility: { dailySigmaPct: 1.4, moveInSigmas: sig },
    volumeRatio: 1 + Math.abs(rnd()),
    headline: `${dir} ${Math.abs(totalPct).toFixed(1)}% since you looked${Math.abs(stockPct) > Math.abs(marketPct) * 1.5 ? " — mostly the stock" : Math.abs(marketPct) > Math.abs(stockPct) ? " — mostly the market" : ""}`,
    why: evidence?.why ?? null,
    summary: `${instrument.name} moved from ₹${then} to ₹${now}, a change of ${totalPct >= 0 ? "+" : "−"}${Math.abs(totalPct).toFixed(1)}%, alongside Nifty 50 at ${marketPct >= 0 ? "+" : "−"}${Math.abs(marketPct).toFixed(1)}%.${evidence ? ` ${evidence.why.replace(/\s*\[\d+\]/g, "")}` : ""}`,
    narration: `${instrument.name} moved ${Math.abs(totalPct).toFixed(1)} percent, from ${then} to ${now} rupees.${evidence ? ` ${evidence.why.replace(/\s*\[\d+\]/g, "")}` : ""}`,
    story: evidence
      ? [{ id: `${instrument.symbol}-1`, kind: evidence.kind, at: niftySeries[7]!.t, title: evidence.title, detail: null, source: evidence.kind === "filing" ? "BSE filing" : evidence.source, sourceUrl: null, url: null, price: closes[7]!, dayChangePct: ((closes[7]! - closes[6]!) / closes[6]!) * 100, tone: totalPct >= 0 ? "up" : "down", weight: 0.8 }]
      : [],
    sources: evidence
      ? [{ id: `${instrument.symbol}-1`, kind: evidence.kind, title: evidence.title, url: "https://www.bseindia.com/", source: evidence.source, publishedAt: "2026-09-02T10:00:00.000Z", category: null, sentiment: null }]
      : [],
    chips: [
      { label: `${sig.toFixed(1)}σ move`, tone: sig > 2 ? (totalPct >= 0 ? "rise" : "fall") : "neutral" },
      { label: `Nifty ${marketPct >= 0 ? "+" : "−"}${Math.abs(marketPct).toFixed(1)}%`, tone: "market" },
    ],
    signals: [{ kind: "unusual_move", tier: 4, at: null, summary: "", data: {} }],
    score: Math.min(1, sig / 3),
    series,
    sinceIndex,
  };
}
