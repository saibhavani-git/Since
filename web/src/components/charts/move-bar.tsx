"use client";

import { motion } from "motion/react";
import { cx } from "@/lib/cx";
import { pct } from "@/lib/format";

/**
 * How much of the move was the market, how much was the stock. Two bars on
 * one scale. The market's share is grey and quiet; the stock's share carries
 * colour and weight, because that is the part that is news.
 */
export function MoveBar({
  totalPct,
  marketPct,
  stockPct,
  indexSymbol,
  onInk = false,
  animate = false,
  delay = 0,
  size = "md",
  className,
}: {
  totalPct: number;
  marketPct: number;
  stockPct: number;
  indexSymbol: string;
  onInk?: boolean;
  animate?: boolean;
  delay?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const scale = Math.max(Math.abs(totalPct), Math.abs(marketPct), Math.abs(stockPct), 0.5);
  const width = (v: number) => `${Math.min(100, (Math.abs(v) / scale) * 100)}%`;
  const stockTone = stockPct >= 0 ? (onInk ? "bg-rise-on-ink" : "bg-rise") : onInk ? "bg-fall-on-ink" : "bg-fall";
  const stockText = stockPct >= 0 ? (onInk ? "text-rise-on-ink" : "text-rise-strong") : onInk ? "text-fall-on-ink" : "text-fall-strong";
  const text2 = onInk ? "text-text-on-ink-2" : "text-text-2";
  const text3 = onInk ? "text-text-on-ink-3" : "text-text-3";
  const track = onInk ? "bg-ink-line" : "bg-canvas-2";
  const sm = size === "sm";
  const ease = [0.16, 1, 0.3, 1] as const;
  const bar = (w: string, cls: string, d: number) =>
    animate ? <motion.div className={cx("h-full rounded-full", cls)} initial={{ width: 0 }} animate={{ width: w }} transition={{ delay: delay + d, duration: 0.7, ease }} /> : <div className={cx("h-full rounded-full", cls)} style={{ width: w }} />;

  return (
    <div className={className}>
      <p className={cx("mb-2 flex items-baseline justify-between", sm ? "text-[11px]" : "text-[12px]")}>
        <span className={cx("font-medium", text2)}>Of that move</span>
        <span className={text3}>vs {indexSymbol.replace("^", "")}</span>
      </p>
      <dl className={cx("grid grid-cols-[56px_1fr_52px] items-center gap-x-3", sm ? "gap-y-2 text-[11px]" : "gap-y-2.5 text-[13px]")}>
        <dt className={text3}>Market</dt>
        <dd className={cx("overflow-hidden rounded-full", sm ? "h-1.5" : "h-2", track)}>{bar(width(marketPct), onInk ? "bg-market-on-ink" : "bg-market", 0)}</dd>
        <dd className={cx("num text-right font-medium", text2)}>{pct(marketPct)}</dd>

        <dt className={cx("font-medium", onInk ? "text-text-on-ink" : "text-text")}>Stock</dt>
        <dd className={cx("overflow-hidden rounded-full", sm ? "h-1.5" : "h-2", track)}>{bar(width(stockPct), stockTone, 0.2)}</dd>
        <dd className={cx("num text-right font-semibold", stockText)}>{pct(stockPct)}</dd>
      </dl>
    </div>
  );
}
