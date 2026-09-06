import { cx } from "@/lib/cx";

/** Six flat tints. A symbol always lands on the same one, so colour becomes recognition. */
const tints = ["bg-tile-lavender", "bg-tile-sage", "bg-tile-blush", "bg-tile-slate", "bg-stale-tint", "bg-iris-tint"] as const;

export function tintFor(key: string): (typeof tints)[number] {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return tints[h % tints.length]!;
}

/**
 * A company's mark when we don't have its logo: two letters on a flat tint.
 * Ink text always, so it reads on every tint.
 */
export function Monogram({ symbol, name, size = "md", className }: { symbol: string; name?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const letters = (name ?? symbol).replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean);
  const text = letters.length >= 2 ? `${letters[0]![0]}${letters[1]![0]}` : (name ?? symbol).slice(0, 2);
  const dims = { sm: "size-8 text-[11px] rounded-[12px]", md: "size-10 text-[13px] rounded-[14px]", lg: "size-14 text-[18px] rounded-[20px]" }[size];
  return (
    <span aria-hidden className={cx("inline-flex shrink-0 items-center justify-center font-semibold uppercase tracking-[-0.02em] text-ink", dims, tintFor(symbol), className)}>
      {text.toUpperCase()}
    </span>
  );
}
