"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { CompanyLogo } from "@/components/brand/company-logo";
import { tintFor } from "@/components/brand/monogram";
import { GapChart } from "@/components/charts/gap-chart";
import { IconArrowRight } from "@/components/ui/icons";
import type { DigestCard as CardT } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { dateLabel, pct, rupees } from "@/lib/format";
import { CardFacts } from "./card-facts";
import { StoryList } from "./story-list";

/**
 * One stock you were away from. Top: who and how much, on the company's
 * colour. Then the chart with your "since" marked, the four numbers you'd
 * look up, a short summary you can read in ten seconds, and what actually
 * happened — the news, one clean line each, tap for the source.
 */
export function DigestCard({ card, since, rank, className }: { card: CardT; since: string; rank: number; className?: string }) {
  const reduce = useReducedMotion();
  const dir = card.move.totalPct > 0 ? "rise" : card.move.totalPct < 0 ? "fall" : "flat";
  const triggered = card.signals.some((s) => s.tier === 1);
  const href = `/stocks/${card.symbol}?since=${encodeURIComponent(since)}`;
  const tint = tintFor(card.symbol);
  const news = card.story.filter((p) => p.kind !== "price");

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: Math.min(rank, 4) * 0.08 }}
      className={cx("group relative flex flex-col overflow-hidden rounded-[28px] border bg-surface transition-colors", triggered ? "border-iris/50" : "border-line hover:border-line-2", className)}
    >
      {/* who, how much */}
      <header className={cx("flex items-center gap-3.5 px-5 py-4", tint)}>
        <CompanyLogo symbol={card.symbol} name={card.instrument.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-ink">{card.instrument.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink/60">
            <span className="font-mono">{card.symbol}</span>
            <span>·</span>
            <span>{card.instrument.exchange}</span>
            {triggered ? (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 font-medium text-ink/80">
                  <span className="size-1.5 rounded-full bg-iris" /> your condition
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-[20px] font-semibold leading-none num text-ink">{rupees(card.priceNow)}</span>
          <span className={cx("mt-1 rounded-full px-2 py-0.5 text-[12.5px] font-semibold num", dir === "rise" ? "bg-rise text-white" : dir === "fall" ? "bg-fall text-white" : "bg-ink text-white")}>{pct(card.move.totalPct)}</span>
        </div>
      </header>

      <Link href={href} className="absolute inset-0 rounded-[28px]" aria-label={`Open ${card.instrument.name}`} />

      <div className="relative flex flex-col p-5 sm:p-6">
        {/* prove it */}
        <div className="pointer-events-auto relative">
          <GapChart series={card.series} sinceIndex={card.sinceIndex} height={96} showLabels={false} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[12px] num text-text-3">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-iris" /> {dateLabel(since)} · {rupees(card.priceThen)}
          </span>
          <span>
            Nifty 50 <span className={cx("font-medium", card.move.indexPct > 0 ? "text-rise" : card.move.indexPct < 0 ? "text-fall" : "text-text-2")}>{pct(card.move.indexPct)}</span>
          </span>
        </div>

        {/* the numbers you'd otherwise look up */}
        <CardFacts card={card} size="sm" className="mt-4" />

        {/* the ten-second read */}
        <p className="mt-5 text-[16px] leading-[1.55] text-text [overflow-wrap:anywhere]">{card.summary}</p>

        {/* what happened */}
        {news.length > 0 ? (
          <div className="pointer-events-auto mt-5 rounded-[20px] border border-line bg-canvas/60 p-4">
            <p className="label mb-3 text-text-3">What happened · {news.length}</p>
            <StoryList points={news} limit={3} />
          </div>
        ) : (
          <p className="mt-4 text-[13.5px] text-text-3">No news or filing about {card.instrument.name} in this window.</p>
        )}

        <footer className="mt-5 flex items-center justify-end text-[13px]">
          <span className="inline-flex items-center gap-1 font-medium text-text-2 transition-colors group-hover:text-text">
            Full story <IconArrowRight width={16} height={16} />
          </span>
        </footer>
      </div>
    </motion.article>
  );
}
