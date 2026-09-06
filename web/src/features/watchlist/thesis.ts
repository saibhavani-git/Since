import type { Thesis } from "@/lib/api/types";

export type ThesisKind = Thesis["kind"];

export const thesisOptions: { kind: ThesisKind; label: string; hint: string; needsPrice: boolean }[] = [
  { kind: "curious", label: "Just watching", hint: "Tell me when something unusual happens.", needsPrice: false },
  { kind: "target_price", label: "Waiting for a price", hint: "Tell me the moment it gets there.", needsPrice: true },
  { kind: "breakout_above", label: "Break above a level", hint: "Tell me when it closes above this.", needsPrice: true },
  { kind: "through_results", label: "Through results", hint: "Tell me when results land and what they did.", needsPrice: false },
];

export function buildThesis(kind: ThesisKind, price: number | null): Thesis | null {
  switch (kind) {
    case "curious":
      return { kind };
    case "through_results":
      return { kind };
    case "target_price":
    case "breakout_above":
      return price && price > 0 ? { kind, price } : null;
  }
}
