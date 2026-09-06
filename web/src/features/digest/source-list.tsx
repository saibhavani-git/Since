import { IconExternal } from "@/components/ui/icons";
import type { Source } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { dateLabel } from "@/lib/format";

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** Publisher favicon via Google's public service; the BSE mark for filings. */
function SourceMark({ s }: { s: Source }) {
  const domain = s.kind === "filing" ? "bseindia.com" : host(s.url);
  return (
    <span className={cx("inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-line bg-white")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- favicon service */}
      {domain ? <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" width={16} height={16} loading="lazy" className="size-4" /> : null}
    </span>
  );
}

/**
 * Numbered so they line up with the [n] markers in the prose. Two densities:
 * `compact` is a footnote strip under a card; the default is a proper list
 * for the report, with the publisher's mark and an official-filing badge.
 */
export function SourceList({ sources, className, compact = false, onInk = false }: { sources: Source[]; className?: string; compact?: boolean; onInk?: boolean }) {
  if (sources.length === 0) return null;

  if (compact) {
    return (
      <ol className={cx("flex flex-col gap-1", className)}>
        {sources.map((s, i) => (
          <li key={s.id} className="flex items-baseline gap-2 text-[12px] leading-snug">
            <span className={cx("shrink-0 font-mono text-[10px]", onInk ? "text-text-on-ink-3" : "text-text-3")}>{i + 1}</span>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className={cx("group min-w-0 truncate", onInk ? "text-text-on-ink-2 hover:text-text-on-ink" : "text-text-2 hover:text-text")}>
              {s.title}
              <span className={cx("ml-1.5", onInk ? "text-text-on-ink-3" : "text-text-3")}>
                · {s.kind === "filing" ? "BSE filing" : s.source} · {dateLabel(s.publishedAt)}
              </span>
            </a>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className={cx("flex flex-col divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-surface", className)}>
      {sources.map((s, i) => (
        <li key={s.id}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-canvas">
            <span className="mt-0.5 flex items-center gap-2">
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-[8px] bg-canvas-2 px-1.5 font-mono text-[11px] text-text-2">{i + 1}</span>
              <SourceMark s={s} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[14px] leading-snug text-text">{s.title}</span>
              <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-text-3">
                {s.kind === "filing" ? <span className="rounded-[4px] bg-iris-tint px-1.5 py-0.5 text-[11px] font-medium text-iris-strong">Official filing</span> : null}
                <span>{s.kind === "filing" ? "BSE" : s.source}</span>
                <span>·</span>
                <span>{dateLabel(s.publishedAt)}</span>
                {s.category ? (
                  <>
                    <span>·</span>
                    <span className="capitalize">{s.category}</span>
                  </>
                ) : null}
              </span>
            </span>
            <IconExternal width={14} height={14} className="mt-1 shrink-0 text-text-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        </li>
      ))}
    </ol>
  );
}
