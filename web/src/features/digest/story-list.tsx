"use client";

import { useState } from "react";
import { IconExternal } from "@/components/ui/icons";
import type { StoryPoint } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { dateLabel, pct, rupees } from "@/lib/format";

const host = (url: string | null) => {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** The publisher's mark; the exchange's for filings; a price dot for milestones. */
function Mark({ p, onInk }: { p: StoryPoint; onInk: boolean }) {
  if (p.kind === "price") {
    return (
      <span className={cx("inline-flex size-7 shrink-0 items-center justify-center rounded-[12px] text-[11px] font-semibold num", p.tone === "up" ? "bg-rise-tint text-rise" : p.tone === "down" ? "bg-fall-tint text-fall" : onInk ? "bg-white/10 text-white" : "bg-canvas-2 text-text-2")}>
        ₹
      </span>
    );
  }
  const domain = p.kind === "filing" ? "bseindia.com" : host(p.sourceUrl ?? p.url);
  return (
    <span className={cx("inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border", onInk ? "border-white/15 bg-white/10" : "border-line bg-white")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- favicon service */}
      {domain ? <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" width={16} height={16} loading="lazy" className="size-4" /> : null}
    </span>
  );
}

/**
 * What happened, one clean line each, most important first. A line is the
 * whole story for most people; tapping one opens the detail and the source.
 * `limit` keeps a card short — the rest sit behind "n more".
 */
export function StoryList({ points, limit, onInk = false, className }: { points: StoryPoint[]; limit?: number; onInk?: boolean; className?: string }) {
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const shown = limit && !showAll ? points.slice(0, limit) : points;
  const hidden = points.length - shown.length;
  if (points.length === 0) return null;

  return (
    <div className={className}>
      <ol className={cx("divide-y", onInk ? "divide-white/10" : "divide-line")}>
        {shown.map((p) => {
          const isOpen = open === p.id;
          const link = p.url ?? p.sourceUrl;
          return (
            <li key={p.id} className="py-2.5 first:pt-0 last:pb-0">
              <button type="button" onClick={() => setOpen(isOpen ? null : p.id)} className="flex w-full items-start gap-3 text-left" aria-expanded={isOpen}>
                <Mark p={p} onInk={onInk} />
                <span className="min-w-0 flex-1">
                  <span className={cx("block text-[14.5px] leading-snug [overflow-wrap:anywhere]", onInk ? "text-white" : "text-text")}>{p.title}</span>
                  <span className={cx("mt-1 flex flex-wrap items-center gap-x-2 text-[12px]", onInk ? "text-white/55" : "text-text-3")}>
                    <span className="font-medium">{p.source}</span>
                    <span>·</span>
                    <span>{dateLabel(p.at)}</span>
                    {p.price != null && p.dayChangePct != null && p.kind !== "price" ? (
                      <>
                        <span>·</span>
                        <span className={cx("num", p.dayChangePct > 0 ? "text-rise" : p.dayChangePct < 0 ? "text-fall" : "")}>
                          {rupees(p.price)} ({pct(p.dayChangePct)}) that day
                        </span>
                      </>
                    ) : null}
                  </span>
                </span>
                <span className={cx("mt-2 size-1.5 shrink-0 rounded-full", p.tone === "up" ? "bg-rise" : p.tone === "down" ? "bg-fall" : onInk ? "bg-white/30" : "bg-line-2")} aria-hidden />
              </button>
              {isOpen ? (
                <div className={cx("ml-10 mt-2 text-[13.5px] leading-relaxed", onInk ? "text-white/80" : "text-text-2")}>
                  {p.detail ? <p>{p.detail}</p> : null}
                  {link ? (
                    <a href={link} target="_blank" rel="noreferrer" className={cx("mt-1.5 inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline", onInk ? "text-white" : "text-iris-strong")}>
                      Read at {p.source} <IconExternal width={13} height={13} />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      {hidden > 0 ? (
        <button type="button" onClick={() => setShowAll(true)} className={cx("mt-3 text-[13px] font-medium", onInk ? "text-white/70 hover:text-white" : "text-text-2 hover:text-text")}>
          {hidden} more →
        </button>
      ) : null}
    </div>
  );
}
