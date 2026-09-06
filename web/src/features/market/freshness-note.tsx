import type { Freshness } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { ago } from "@/lib/format";

/** Honest about data age. Stale gets amber; delayed is stated, not hidden. */
export function FreshnessNote({ freshness, className, bare = false }: { freshness: Freshness; className?: string; bare?: boolean }) {
  const text = freshness.stale
    ? `stale · as of ${ago(freshness.asOf)}`
    : freshness.delayedMinutes > 0
      ? `${freshness.delayedMinutes}-min delayed · ${ago(freshness.asOf)}`
      : `live · ${ago(freshness.asOf)}`;
  return (
    <span className={cx(freshness.stale ? "text-stale" : "text-text-3", className)}>
      {bare ? text : `· ${text}`}
    </span>
  );
}
