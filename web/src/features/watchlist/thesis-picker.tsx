"use client";

import { cx } from "@/lib/cx";
import { thesisOptions, type ThesisKind } from "./thesis";

/**
 * "Why are you watching this?" — one tap. The answer is what lets Since rank
 * changes for *this* person instead of for everyone.
 */
export function ThesisPicker({
  kind,
  price,
  onKind,
  onPrice,
  currentPrice,
}: {
  kind: ThesisKind;
  price: string;
  onKind: (k: ThesisKind) => void;
  onPrice: (p: string) => void;
  currentPrice?: number | null;
}) {
  const selected = thesisOptions.find((o) => o.kind === kind)!;
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Why are you watching this?" className="grid grid-cols-2 gap-2">
        {thesisOptions.map((o) => {
          const active = o.kind === kind;
          return (
            <button
              key={o.kind}
              role="radio"
              aria-checked={active}
              onClick={() => onKind(o.kind)}
              className={cx(
                "rounded-[14px] border px-3.5 py-3 text-left transition-colors",
                active ? "border-ink bg-ink text-white" : "border-line-2 bg-surface text-text hover:border-text-3",
              )}
            >
              <p className="text-[14px] font-medium">{o.label}</p>
              <p className={cx("mt-0.5 text-[12px] leading-snug", active ? "text-text-on-ink-2" : "text-text-3")}>{o.hint}</p>
            </button>
          );
        })}
      </div>
      {selected.needsPrice ? (
        <label className="flex h-12 items-center rounded-[14px] border border-line-2 bg-surface focus-within:border-text-2">
          <span className="pl-4 pr-1 font-mono text-[14px] text-text-3">₹</span>
          <input
            inputMode="decimal"
            placeholder={currentPrice ? `now ${currentPrice.toFixed(0)}` : "Price"}
            value={price}
            onChange={(e) => onPrice(e.target.value.replace(/[^\d.]/g, ""))}
            className="h-full min-w-0 flex-1 bg-transparent pr-4 text-[15px] num outline-none placeholder:text-text-3"
            aria-label="Price level"
            autoFocus
          />
        </label>
      ) : null}
    </div>
  );
}
