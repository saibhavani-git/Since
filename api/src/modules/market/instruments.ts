/**
 * The instrument universe: NIFTY 50 constituents plus a few widely‑held
 * names. Seeded into `instruments` at boot. `basePrice` is only a reference
 * for the fixture provider.
 *
 * A production deployment would load this from the exchange's daily
 * bhavcopy; the shape stays the same.
 */
export interface UniverseEntry {
  symbol: string;
  name: string;
  sector: string;
  basePrice: number;
}

/**
 * BSE scrip codes for dual‑listed names. Needed only by the BSE filings
 * adapter; a symbol without a code simply gets no filings. In production this
 * comes from the exchange's master file.
 */
export const BSE_CODES: Readonly<Record<string, string>> = {
  RELIANCE: "500325", TCS: "532540", INFY: "500209", HDFCBANK: "500180", ICICIBANK: "532174",
  SBIN: "500112", ITC: "500875", BHARTIARTL: "532454", LT: "500510", HINDUNILVR: "500696",
  KOTAKBANK: "500247", AXISBANK: "532215", BAJFINANCE: "500034", MARUTI: "532500", "M&M": "500520",
  SUNPHARMA: "524715", NTPC: "532555", POWERGRID: "532898", TITAN: "500114", ETERNAL: "543320",
  PAYTM: "543396", DMART: "540376", IRCTC: "542830", TATACONSUM: "500800", JIOFIN: "543940",
  WIPRO: "507685", HCLTECH: "532281", TECHM: "532755", ULTRACEMCO: "532538", NESTLEIND: "500790",
  ONGC: "500312", COALINDIA: "533278", TATASTEEL: "500470", JSWSTEEL: "500228", HINDALCO: "500440",
  BAJAJFINSV: "532978", INDUSINDBK: "532187", DRREDDY: "500124", CIPLA: "500087", APOLLOHOSP: "508869",
  GRASIM: "500300", BPCL: "500547", TATAPOWER: "500400", HAL: "541154", BEL: "500049",
  ASIANPAINT: "500820", ADANIENT: "512599", ADANIPORTS: "532921", TRENT: "500251", SHRIRAMFIN: "511218",
  EICHERMOT: "505200", HEROMOTOCO: "500182", "BAJAJ-AUTO": "532977", DIVISLAB: "532488",
};

export const INSTRUMENT_UNIVERSE: readonly UniverseEntry[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", basePrice: 1320 },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking", basePrice: 1710 },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banking", basePrice: 1240 },
  { symbol: "INFY", name: "Infosys", sector: "IT Services", basePrice: 1520 },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT Services", basePrice: 3480 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", basePrice: 1740 },
  { symbol: "ITC", name: "ITC", sector: "FMCG", basePrice: 425 },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking", basePrice: 810 },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Infrastructure", basePrice: 3560 },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking", basePrice: 1950 },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Banking", basePrice: 1120 },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG", basePrice: 2380 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Financial Services", basePrice: 920 },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Automobile", basePrice: 12400 },
  { symbol: "M&M", name: "Mahindra & Mahindra", sector: "Automobile", basePrice: 3120 },
  // Tata Motors demerged in Oct 2025: passenger vehicles (TMPV) and commercial vehicles (TMCV).
  { symbol: "TMPV", name: "Tata Motors Passenger Vehicles", sector: "Automobile", basePrice: 310 },
  { symbol: "TMCV", name: "Tata Motors (Commercial Vehicles)", sector: "Automobile", basePrice: 455 },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Pharma", basePrice: 1680 },
  { symbol: "NTPC", name: "NTPC", sector: "Power", basePrice: 335 },
  { symbol: "POWERGRID", name: "Power Grid Corporation", sector: "Power", basePrice: 290 },
  { symbol: "TITAN", name: "Titan Company", sector: "Consumer", basePrice: 3420 },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", sector: "Cement", basePrice: 11900 },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "Consumer", basePrice: 2340 },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "IT Services", basePrice: 1560 },
  { symbol: "WIPRO", name: "Wipro", sector: "IT Services", basePrice: 262 },
  { symbol: "TECHM", name: "Tech Mahindra", sector: "IT Services", basePrice: 1520 },
  { symbol: "ONGC", name: "Oil & Natural Gas Corporation", sector: "Energy", basePrice: 245 },
  { symbol: "COALINDIA", name: "Coal India", sector: "Mining", basePrice: 395 },
  { symbol: "TATASTEEL", name: "Tata Steel", sector: "Metals", basePrice: 158 },
  { symbol: "JSWSTEEL", name: "JSW Steel", sector: "Metals", basePrice: 1010 },
  { symbol: "HINDALCO", name: "Hindalco Industries", sector: "Metals", basePrice: 690 },
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Conglomerate", basePrice: 2380 },
  { symbol: "ADANIPORTS", name: "Adani Ports & SEZ", sector: "Infrastructure", basePrice: 1380 },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", sector: "Financial Services", basePrice: 1990 },
  { symbol: "NESTLEIND", name: "Nestlé India", sector: "FMCG", basePrice: 2360 },
  { symbol: "GRASIM", name: "Grasim Industries", sector: "Cement", basePrice: 2740 },
  { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories", sector: "Pharma", basePrice: 1280 },
  { symbol: "CIPLA", name: "Cipla", sector: "Pharma", basePrice: 1520 },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals", sector: "Healthcare", basePrice: 7200 },
  { symbol: "EICHERMOT", name: "Eicher Motors", sector: "Automobile", basePrice: 5480 },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", sector: "Automobile", basePrice: 8600 },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp", sector: "Automobile", basePrice: 4280 },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", sector: "Banking", basePrice: 840 },
  { symbol: "SBILIFE", name: "SBI Life Insurance", sector: "Insurance", basePrice: 1810 },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance", sector: "Insurance", basePrice: 760 },
  { symbol: "TRENT", name: "Trent", sector: "Retail", basePrice: 5300 },
  { symbol: "BEL", name: "Bharat Electronics", sector: "Defence", basePrice: 410 },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance", sector: "Financial Services", basePrice: 640 },
  { symbol: "JIOFIN", name: "Jio Financial Services", sector: "Financial Services", basePrice: 310 },
  { symbol: "ETERNAL", name: "Eternal (Zomato)", sector: "Internet", basePrice: 305 },
  { symbol: "TATACONSUM", name: "Tata Consumer Products", sector: "FMCG", basePrice: 1090 },
  { symbol: "DMART", name: "Avenue Supermarts (DMart)", sector: "Retail", basePrice: 4100 },
  { symbol: "IRCTC", name: "IRCTC", sector: "Travel", basePrice: 760 },
  { symbol: "PAYTM", name: "One 97 Communications (Paytm)", sector: "Fintech", basePrice: 1120 },
  { symbol: "NYKAA", name: "FSN E‑Commerce (Nykaa)", sector: "Internet", basePrice: 205 },
  { symbol: "IDEA", name: "Vodafone Idea", sector: "Telecom", basePrice: 7.4 },
  { symbol: "YESBANK", name: "Yes Bank", sector: "Banking", basePrice: 20.5 },
  { symbol: "SUZLON", name: "Suzlon Energy", sector: "Renewables", basePrice: 58 },
  { symbol: "TATAPOWER", name: "Tata Power", sector: "Power", basePrice: 395 },
  { symbol: "IRFC", name: "Indian Railway Finance Corp", sector: "Financial Services", basePrice: 128 },
];

export const basePriceMap = (): Map<string, number> =>
  new Map([...INSTRUMENT_UNIVERSE.map((i) => [i.symbol, i.basePrice] as const), ["NIFTY 50", 24000] as const]);
