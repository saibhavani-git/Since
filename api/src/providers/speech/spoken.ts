/**
 * Written text → text a voice should read. Citations vanish, typographic
 * symbols become words, and "−1.3%" becomes "minus 1.3 percent" so a TTS
 * model never has to guess at a glyph.
 */
export function spoken(text: string): string {
  const w = WORDS;
  return text
    .replace(/\s*\[\d+\]/g, "") // [2] citations
    .replace(/[\u2011\u2010]/g, "-") // non‑breaking / typographic hyphens
    .replace(/\u2212\s?(\d)/g, `${w.minus} $1`) // −1.3
    .replace(/(?<![\w₹])-(\d)/g, `${w.minus} $1`) // -1.3 (not inside 52-week)
    .replace(/\+(\d)/g, `${w.plus} $1`)
    .replace(/₹\s?([\d,]+(?:\.\d+)?)/g, `$1 ${w.rupees}`)
    .replace(/(\d)%/g, `$1 ${w.percent}`)
    .replace(/(\d(?:\.\d+)?)\s?σ/g, `$1 ${w.sigma}`)
    .replace(/(\d(?:\.\d+)?)\s?×/g, `$1 ${w.times}`)
    .replace(/\bβ\b/g, w.beta)
    .replace(/[“”]/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}

const WORDS = { minus: "minus", plus: "up", rupees: "rupees", percent: "percent", sigma: "sigma", times: "times", beta: "beta" };
