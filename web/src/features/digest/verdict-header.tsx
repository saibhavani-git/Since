import { Pill } from "@/components/ui/pill";
import { FreshnessNote } from "@/features/market/freshness-note";
import type { Digest } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { pct } from "@/lib/format";

/**
 * The answer, before any card, on a flat tile whose colour is the verdict:
 * lavender when something you asked for happened, paper when something is
 * worth a look, sage when nothing is. The right column is the ledger —
 * four numbers that frame the whole catch-up.
 */
export function VerdictHeader({ digest, actions }: { digest: Digest; actions?: React.ReactNode }) {
  const tone = digest.verdict.tone;
  const tile = { triggered: "bg-tile-lavender", look: "bg-surface border border-line", nothing: "bg-tile-sage" }[tone];
  const sub = tone === "look" ? "text-text-2" : "text-ink/70";
  const worth = digest.cards.length;
  const quiet = digest.quiet.length;
  const idx = digest.market.indexPct;

  return (
    <header className={cx("rounded-[28px] p-6 sm:p-8", tile)}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={tone === "look" ? "outline" : "ink"} className={tone !== "look" ? "bg-ink/85" : undefined}>
              {/^since\b/i.test(digest.gap.sinceLabel) ? digest.gap.sinceLabel : `Since ${digest.gap.sinceLabel}`}
            </Pill>
            {digest.gap.sessions > 0 ? (
              <span className={cx("text-[13px]", sub)}>
                {digest.gap.sessions} {digest.gap.sessions === 1 ? "session" : "sessions"}
              </span>
            ) : null}
          </div>
          <h1 className="display mt-5 max-w-[18ch] text-[40px] sm:text-[56px]">{digest.verdict.headline}</h1>
          <p className={cx("mt-4 max-w-[58ch] text-[16px] leading-relaxed sm:text-[17px]", sub)}>{digest.verdict.subline}</p>
          {actions ? <div className="mt-6 flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        <dl className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[440px] lg:grid-cols-2">
          <Stat label="Worth a look" value={String(worth)} accent={worth > 0 ? "iris" : undefined} dark={tone !== "look"} />
          <Stat label="Quiet" value={String(quiet)} dark={tone !== "look"} />
          <Stat label={digest.market.indexSymbol.replace("^", "")} value={pct(idx)} accent={idx > 0 ? "rise" : idx < 0 ? "fall" : undefined} dark={tone !== "look"} />
          <Stat label="Data" value={<FreshnessNote freshness={digest.freshness} bare />} dark={tone !== "look"} small />
        </dl>
      </div>
    </header>
  );
}

function Stat({ label, value, accent, dark, small }: { label: string; value: React.ReactNode; accent?: "iris" | "rise" | "fall"; dark: boolean; small?: boolean }) {
  const color = accent === "iris" ? "text-iris-strong" : accent === "rise" ? "text-rise-strong" : accent === "fall" ? "text-fall-strong" : "text-text";
  return (
    <div className={cx("rounded-[20px] px-4 py-3.5", dark ? "bg-white/60" : "bg-canvas")}>
      <dt className="text-[12px] font-medium text-text-3">{label}</dt>
      <dd className={cx("mt-1 num", small ? "text-[13px] font-medium leading-snug [&_*]:text-text-2" : "display text-[24px]", color)}>{value}</dd>
    </div>
  );
}
