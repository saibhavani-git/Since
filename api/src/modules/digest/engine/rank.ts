import type { RawSignal } from "./signals.js";
import type { EngineConfig } from "./types.js";

/**
 * Score = best tier's weight + 10·|z| + small bonuses for corroborating
 * signals. Tier dominates by construction: no amount of σ turns a tier‑4
 * move into a tier‑1 card.
 */
export function score(signals: readonly RawSignal[], moveInSigmas: number, config: EngineConfig): number {
  if (signals.length === 0) return 0;
  const best = Math.min(...signals.map((s) => s.tier)) as 1 | 2 | 3 | 4;
  const corroboration = (signals.length - 1) * 5;
  return Math.round((config.tierWeight[best] + 10 * Math.abs(moveInSigmas) + corroboration) * 10) / 10;
}
