/** Indian digit grouping: 2,84,760.40 */
const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

export const rupees = (n: number): string => `₹${inr.format(round(n, 2))}`;

export const pct = (n: number, digits = 1): string => {
  const v = round(n, digits);
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(digits)}%`;
};

/** Magnitude only, for sentences that already say "up"/"down". */
export const pctAbs = (n: number, digits = 1): string => `${Math.abs(round(n, digits)).toFixed(digits)}%`;

export const round = (n: number, digits = 2): number => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

/**
 * The name people say. "One 97 Communications (Paytm)" → "Paytm";
 * "Tata Consultancy Services Limited" → "Tata Consultancy Services".
 */
export function displayName(name: string): string {
  const paren = /\(([^)]+)\)\s*$/.exec(name);
  if (paren?.[1] && paren[1].length <= 24) return paren[1].trim();
  return name.replace(/\s+(limited|ltd\.?|corporation|corp\.?)$/i, "").trim();
}
