import { z } from "zod";
import { Freshness, IsoDateTime } from "./common.js";

export const Exchange = z.enum(["NSE", "BSE"]);

/** NSE trading symbol, e.g. RELIANCE, HDFCBANK. Upper‑case, no suffix. */
export const Symbol = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9&\-]{1,20}$/, "Not a valid symbol");
export type Symbol = z.infer<typeof Symbol>;

export const Instrument = z.object({
  symbol: Symbol,
  name: z.string(),
  exchange: Exchange,
  sector: z.string().nullable(),
});
export type Instrument = z.infer<typeof Instrument>;

export const Quote = z.object({
  symbol: Symbol,
  price: z.number(),
  previousClose: z.number(),
  open: z.number().nullable(),
  dayHigh: z.number().nullable(),
  dayLow: z.number().nullable(),
  volume: z.number().nullable(),
  averageVolume: z.number().nullable(),
  change: z.number(),
  changePct: z.number(),
  fiftyTwoWeekHigh: z.number().nullable(),
  fiftyTwoWeekLow: z.number().nullable(),
  freshness: Freshness,
});
export type Quote = z.infer<typeof Quote>;

export const Candle = z.object({
  t: IsoDateTime,
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number().nullable(),
});
export type Candle = z.infer<typeof Candle>;

export const CandleRange = z.enum(["1M", "3M", "6M", "1Y"]);
export type CandleRange = z.infer<typeof CandleRange>;

export const CandleSeries = z.object({
  symbol: Symbol,
  range: CandleRange,
  candles: z.array(Candle),
  freshness: Freshness,
});

export const InstrumentEvents = z.object({
  nextResultsAt: IsoDateTime.nullable(),
  lastResultsAt: IsoDateTime.nullable(),
  exDividendAt: IsoDateTime.nullable(),
});
export type InstrumentEvents = z.infer<typeof InstrumentEvents>;

export const StockDetail = z.object({
  instrument: Instrument,
  /** NSE quote — the primary listing. */
  quote: Quote,
  events: InstrumentEvents,
  /** The BSE listing's quote when requested with `?exchange=both`; null otherwise or if not dual‑listed. */
  bseQuote: Quote.nullable(),
});
export type StockDetail = z.infer<typeof StockDetail>;

export const SearchQuery = z.object({ q: z.string().trim().min(1).max(40) });
export const SearchResponse = z.object({ results: z.array(Instrument) });

export const MarketPhase = z.enum(["pre_open", "open", "post_close", "closed_weekend", "closed_holiday"]);
export type MarketPhase = z.infer<typeof MarketPhase>;

export const MarketStatus = z.object({
  phase: MarketPhase,
  at: IsoDateTime,
  nextOpenAt: IsoDateTime.nullable(),
  lastCloseAt: IsoDateTime.nullable(),
  holidayName: z.string().nullable(),
});
export type MarketStatus = z.infer<typeof MarketStatus>;
