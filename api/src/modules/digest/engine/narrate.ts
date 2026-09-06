import type { Chip, MoveDecomposition, Signal, Verdict, VerdictTone } from "../../../contracts/index.js";
import { pct, pctAbs, rupees } from "../../../lib/format.js";
import { labelInstant } from "../../../lib/ist.js";
import type { RawSignal } from "./signals.js";

/**
 * Narration is templated. Every sentence states a fact; causes appear only
 * when they are facts (an index move, a results date). Never advice.
 */
export interface Narrator {
  sinceLabel(since: Date, now: Date): string;
  openLabel(sessions: number): string;
  marketHeadline(indexName: string, indexPct: number): string;
  signal(s: RawSignal, ctx: SignalNarrationContext): string;
  headline(primary: RawSignal | null, ctx: SignalNarrationContext, move: MoveDecomposition): string;
  verdict(tone: VerdictTone, cards: number, quiet: number): Verdict;
  chips(move: MoveDecomposition, signals: readonly RawSignal[], volumeRatio: number | null, stale: boolean): Chip[];
  quietFooter(quiet: number): string;
  /** Spoken lines. Shorter and warmer than the on‑screen copy; numbers stay as digits for TTS. */
  spoken: {
    intro(sinceLabel: string, verdict: Verdict): string;
    quiet(names: readonly string[], total: number): string;
    outro(): string;
  };
}

/** "Reliance, Infosys and seven more" — never a full list read aloud. */
function listNames(names: readonly string[], total: number, and: string, more: (n: number) => string): string {
  const shown = names.slice(0, 2);
  const rest = total - shown.length;
  if (shown.length === 0) return "";
  if (rest <= 0) return shown.join(` ${and} `);
  return `${shown.join(", ")} ${and} ${more(rest)}`;
}

export interface SignalNarrationContext {
  name: string;
  priceNow: number;
  priceThen: number;
  totalPct: number;
  now: Date;
}

const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const word = (n: number): string => words[n] ?? String(n);
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const dayEn = new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" });
const sig = (s: RawSignal, key: string): number => Number(s.data[key] ?? 0);

/* -------------------------------------------------------------------------- */

class English implements Narrator {
  sinceLabel(since: Date, now: Date): string {
    return `Since ${labelInstant(since, now)}`;
  }
  openLabel(sessions: number): string {
    if (sessions === 0) return "Markets haven't traded since then.";
    return sessions === 1 ? "Markets traded for one session since then." : `Markets traded for ${word(sessions)} sessions since then.`;
  }
  marketHeadline(indexName: string, indexPct: number): string {
    if (Math.abs(indexPct) < 0.2) return `${indexName} is flat since you left.`;
    return `${indexName} is ${indexPct > 0 ? "up" : "down"} ${pctAbs(indexPct)} since you left.`;
  }
  signal(s: RawSignal, c: SignalNarrationContext): string {
    switch (s.kind) {
      case "thesis_target_reached":
        return s.data.stillBeyond
          ? `${c.name} reached the ${rupees(sig(s, "target"))} you were waiting for. It's at ${rupees(c.priceNow)}.`
          : `${c.name} touched your ${rupees(sig(s, "target"))} target${s.at ? ` on ${dayEn.format(new Date(s.at))}` : ""}, and is back at ${rupees(c.priceNow)}.`;
      case "thesis_breakout":
        return `${c.name} broke above ${rupees(sig(s, "level"))}, the level you were watching. It's at ${rupees(c.priceNow)}.`;
      case "thesis_results_landed":
        return `${c.name} reported results${s.at ? ` on ${dayEn.format(new Date(s.at))}` : ""} — the event you were holding for.`;
      case "results_upcoming":
        return sig(s, "inDays") <= 1 ? `${c.name} reports results tomorrow.` : `${c.name} reports results in ${word(sig(s, "inDays"))} days.`;
      case "ex_dividend_upcoming":
        return `${c.name} goes ex‑dividend in ${word(sig(s, "inDays"))} days.`;
      case "week52_high":
        return `${c.name} hit a new 52‑week high${s.at ? ` on ${dayEn.format(new Date(s.at))}` : ""}, up ${pctAbs(c.totalPct)} since you looked.`;
      case "week52_low":
        return `${c.name} hit a new 52‑week low${s.at ? ` on ${dayEn.format(new Date(s.at))}` : ""}, down ${pctAbs(c.totalPct)} since you looked.`;
      case "crossed_added_price":
        return `${c.name} is now ${s.data.above ? "above" : "below"} the ${rupees(sig(s, "level"))} you added it at.`;
      case "round_number_crossed":
        return `${c.name} crossed ${rupees(sig(s, "level"))}, ${c.totalPct >= 0 ? "up" : "down"} ${pctAbs(c.totalPct)} since you looked.`;
      case "volume_spike":
        return `${c.name} traded ${sig(s, "ratio")}× its usual volume and is ${c.totalPct >= 0 ? "up" : "down"} ${pctAbs(c.totalPct)}.`;
      case "unusual_move":
        return `${c.name} is ${c.totalPct >= 0 ? "up" : "down"} ${pctAbs(c.totalPct)}, ${Math.abs(sig(s, "sigmas")).toFixed(1)}× its usual move.`;
      case "gap_open":
        return `${c.name} opened ${sig(s, "pct") > 0 ? "up" : "down"} ${pctAbs(sig(s, "pct"))} today.`;
    }
  }
  headline(primary: RawSignal | null, c: SignalNarrationContext, m: MoveDecomposition): string {
    const lead = primary ? this.signal(primary, c) : `${c.name} is ${m.totalPct >= 0 ? "up" : "down"} ${pctAbs(m.totalPct)} since you left.`;
    return `${lead} ${this.attribution(m)}`.trim();
  }
  attribution(m: MoveDecomposition): string {
    if (Math.abs(m.totalPct) < 0.5) return "";
    const marketDominates = Math.abs(m.marketPct) > Math.abs(m.stockPct) && Math.sign(m.marketPct) === Math.sign(m.totalPct);
    if (marketDominates) return `Mostly the market: Nifty went ${pct(m.indexPct)}.`;
    if (Math.abs(m.indexPct) < 0.5) return "The market was flat; this one is the stock’s own.";
    if (Math.sign(m.indexPct) !== Math.sign(m.totalPct)) return `Against the market — Nifty went ${pct(m.indexPct)}.`;
    return `Nifty went ${pct(m.indexPct)}; the stock’s own part is ${pct(m.stockPct)}.`;
  }
  verdict(tone: VerdictTone, cards: number, quiet: number): Verdict {
    switch (tone) {
      case "nothing":
        return { tone, headline: "No company update to catch up on.", subline: `We checked ${word(quiet)} ${quiet === 1 ? "stock" : "stocks"}; no substantive news, filing or unusual move showed up.` };
      case "look":
        return {
          tone,
          headline: cards === 1 ? "One thing is worth a look." : `${cap(word(cards))} things are worth a look.`,
          subline: quiet ? `${cap(word(quiet))} had no company-specific update.` : "",
        };
      case "triggered":
        return {
          tone,
          headline: "Something you were waiting for happened.",
          subline: cards > 1 ? `${cap(word(cards - 1))} more worth a look. ${quiet ? `${cap(word(quiet))} quiet.` : ""}`.trim() : quiet ? `${cap(word(quiet))} quiet.` : "",
        };
    }
  }
  chips(m: MoveDecomposition, signals: readonly RawSignal[], volumeRatio: number | null, stale: boolean): Chip[] {
    const chips: Chip[] = [{ label: `Nifty ${pct(m.indexPct)}`, tone: "market" }];
    if (volumeRatio && volumeRatio >= 1.5) chips.push({ label: `Vol ${volumeRatio.toFixed(1)}× avg`, tone: "neutral" });
    for (const s of signals) {
      if (s.tier === 1) chips.push({ label: "Your thesis", tone: "iris" });
      else if (s.kind === "results_upcoming") chips.push({ label: sig(s, "inDays") <= 1 ? "Results tomorrow" : `Results in ${sig(s, "inDays")}d`, tone: "iris" });
      else if (s.kind === "week52_high") chips.push({ label: "52W high", tone: "rise" });
      else if (s.kind === "week52_low") chips.push({ label: "52W low", tone: "fall" });
    }
    if (stale) chips.push({ label: "Delayed data", tone: "stale" });
    return dedupe(chips);
  }
  quietFooter(quiet: number): string {
    return quiet === 1 ? "It moved less than it usually does in a day." : "All moved less than they usually do in a day.";
  }
  spoken = {
    intro: (sinceLabel: string, verdict: Verdict): string => `${sinceLabel}. ${verdict.headline}`,
    quiet: (names: readonly string[], total: number): string =>
      total === 0
        ? ""
        : `No company-specific update showed up for ${listNames(names, total, "and", (n) => `${n} more`)}. ${total === 1 ? "Its" : "Their"} price stayed within the usual range.`,
    outro: (): string => "That's everything. You're caught up.",
  };
}

/** The one narrator the product speaks with. */
export const narrator: Narrator = new English();

export function finalizeSignals(signals: readonly RawSignal[], narrator: Narrator, ctx: SignalNarrationContext): Signal[] {
  return signals.map((s) => ({ ...s, summary: narrator.signal(s, ctx) }));
}

function dedupe(chips: Chip[]): Chip[] {
  const seen = new Set<string>();
  return chips.filter((c) => (seen.has(c.label) ? false : (seen.add(c.label), true)));
}
