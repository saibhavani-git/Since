"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useStockNews } from "@/features/market/use-market";
import type { Source } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { dateLabel } from "@/lib/format";

/**
 * The paper trail: what was filed and written about this stock in the last
 * week, links included. Filings wear sage, the press wears sky — the same
 * tiles the rest of the product speaks in.
 */
export function StockNews({ symbol }: { symbol: string }) {
  const news = useStockNews(symbol);

  return (
    <section className="rounded-[28px] border border-line bg-surface p-5 shadow-card sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-canvas px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-text-2">The paper trail</span>
        <span className="text-[12px] text-text-3">past week · filings first</span>
      </div>

      {news.isPending ? (
        <div className="mt-5 flex flex-col gap-3" aria-busy>
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : news.isError || !news.data || news.data.sources.length === 0 ? (
        <p className="mt-5 text-[14px] leading-relaxed text-text-3">
          Nothing on the wires this week. Quiet is an answer too.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {news.data.sources.map((s) => (
            <SourceRow key={s.id} source={s} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SourceRow({ source }: { source: Source }) {
  return (
    <li>
      <a href={source.url} target="_blank" rel="noreferrer" className="group flex items-center gap-4 rounded-[14px] py-4 pr-1">
        <span
          className={cx(
            "hidden w-[64px] shrink-0 justify-center rounded-full py-1 text-[10px] font-bold uppercase tracking-[0.07em] text-ink/70 sm:inline-flex",
            source.kind === "filing" ? "bg-tile-sage" : "bg-tile-sky",
          )}
        >
          {source.kind}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium leading-snug transition-colors group-hover:text-iris-strong">{source.title}</span>
          <span className="mt-1 block text-[12.5px] text-text-3">
            {source.source} · {dateLabel(source.publishedAt)}
          </span>
        </span>
        <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden className="shrink-0 text-text-3 opacity-0 transition-opacity group-hover:opacity-100">
          <path d="M5 11 11 5M6.5 5H11v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </a>
    </li>
  );
}
