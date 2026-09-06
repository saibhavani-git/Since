import { cx } from "@/lib/cx";

/** Tiny closing-price line. Coloured by its own direction, or market grey when asked. */
export function Sparkline({ values, className, width = 96, height = 28, tone = "auto" }: { values: number[]; className?: string; width?: number; height?: number; tone?: "auto" | "market" }) {
  if (values.length < 2) return <div className={cx("bg-canvas-2 rounded-xs", className)} style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${((i / (values.length - 1)) * (width - 2) + 1).toFixed(1)},${(1 + (1 - (v - min) / span) * (height - 2)).toFixed(1)}`)
    .join(" ");
  const dir = values[values.length - 1]! - values[0]!;
  const stroke = tone === "market" ? "var(--color-market)" : dir > 0 ? "var(--color-rise)" : dir < 0 ? "var(--color-fall)" : "var(--color-market)";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cx("shrink-0", className)} aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
