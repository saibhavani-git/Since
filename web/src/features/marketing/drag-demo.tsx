"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { MoveBar } from "@/components/charts/move-bar";
import { cx } from "@/lib/cx";
import { pct, rupees, shortStamp } from "@/lib/format";
import { demoCard, niftySeries } from "./demo-data";

const W = 640;
const H = 200;
const PAD_X = 24;
const PAD_Y = 22;

/**
 * The product in one gesture. Drag the iris dot — the moment you last looked —
 * and the headline, the percentage and the market split rewrite live.
 * Pointer events on the svg only; keyboard arrows work on the dot.
 */
export function DragDemo({ className }: { className?: string }) {
  const series = demoCard.series;
  const [since, setSince] = useState(demoCard.sinceIndex);
  const [dragging, setDragging] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const last = series.length - 1;

  const m = useMemo(() => {
    const closes = series.map((p) => p.c);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const x = (i: number) => PAD_X + (i / last) * (W - PAD_X * 2);
    const y = (v: number) => PAD_Y + (1 - (v - min) / span) * (H - PAD_Y * 2);
    const path = (a: number, b: number) =>
      series
        .slice(a, b + 1)
        .map((p, i) => `${i === 0 ? "M" : "L"}${x(a + i).toFixed(1)},${y(p.c).toFixed(1)}`)
        .join(" ");
    return { x, y, path };
  }, [series, last]);

  const then = series[since]!.c;
  const now = series[last]!.c;
  const total = ((now - then) / then) * 100;
  const market = ((niftySeries[last]!.c - niftySeries[since]!.c) / niftySeries[since]!.c) * 100;
  const stock = total - market * demoCard.move.beta;
  const dir = total > 0.05 ? "rise" : total < -0.05 ? "fall" : "flat";
  const sessions = last - since;

  const headline =
    sessions === 0
      ? "You're looking at now. Nothing has changed yet."
      : `${dir === "rise" ? "Up" : dir === "fall" ? "Down" : "Flat"} ${Math.abs(total).toFixed(1)}% since you looked${
          Math.abs(stock) > Math.abs(market) * 1.5 ? " — most of it the stock, not the market" : Math.abs(market) > Math.abs(stock) ? " — mostly the market" : ""
        }`;

  const fromPointer = useCallback(
    (e: React.PointerEvent) => {
      const el = svg.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const rel = ((e.clientX - r.left) / r.width) * W;
      const i = Math.round(((rel - PAD_X) / (W - PAD_X * 2)) * last);
      setSince(Math.min(last, Math.max(0, i)));
    },
    [last],
  );

  const stroke = dir === "rise" ? "var(--color-rise)" : dir === "fall" ? "var(--color-fall)" : "var(--color-text-3)";

  return (
    <div className={cx("rounded-[24px] border border-line bg-surface p-6 sm:p-8", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[12px] tracking-wide text-text-3">RELIANCE · NSE</p>
          <h3 className="display mt-1.5 text-[22px] leading-[1.08] sm:text-[26px] min-h-[2.2em]">{headline}</h3>
        </div>
        <div className="shrink-0 text-right num">
          <p className={cx("display text-[28px]", dir === "rise" ? "text-rise-strong" : dir === "fall" ? "text-fall-strong" : "text-text-2")}>{pct(total)}</p>
          <p className="mt-1 text-[12px] text-text-3">
            {rupees(then)} → {rupees(now)}
          </p>
        </div>
      </div>

      <div className="relative mt-6 select-none">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className={cx("block w-full touch-none", dragging ? "cursor-grabbing" : "cursor-grab")}
          onPointerDown={(e) => {
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
            fromPointer(e);
          }}
          onPointerMove={(e) => dragging && fromPointer(e)}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          role="slider"
          aria-label="The moment you last looked"
          aria-valuemin={0}
          aria-valuemax={last}
          aria-valuenow={since}
          aria-valuetext={shortStamp(series[since]!.t)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setSince((s) => Math.max(0, s - 1));
            if (e.key === "ArrowRight") setSince((s) => Math.min(last, s + 1));
          }}
        >
          {series.map((_, i) => (
            <line key={i} x1={m.x(i)} x2={m.x(i)} y1={PAD_Y} y2={H - PAD_Y} stroke="var(--color-line)" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={m.path(0, since)} fill="none" stroke="var(--color-market)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <motion.path
            d={m.path(since, last)}
            fill="none"
            stroke={stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2 7"
            vectorEffect="non-scaling-stroke"
            animate={{ stroke }}
            transition={{ duration: 0.3 }}
          />
          <circle cx={m.x(last)} cy={m.y(now)} r="4.5" fill={stroke} />
          <motion.g animate={{ x: m.x(since), y: m.y(then) }} transition={{ type: "spring", stiffness: 500, damping: 34 }}>
            <motion.circle r="16" fill="var(--color-iris)" opacity="0.15" animate={{ r: dragging ? 22 : 16 }} />
            <circle r="7" fill="var(--color-iris)" stroke="#fff" strokeWidth="3" />
          </motion.g>
        </svg>
        <motion.span
          className="label absolute -bottom-1 -translate-x-1/2 whitespace-nowrap text-iris"
          animate={{ left: `${(m.x(since) / W) * 100}%` }}
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
        >
          you · {shortStamp(series[since]!.t)}
        </motion.span>
        <span className="label absolute -bottom-1 right-0 text-text-3">now</span>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <MoveBar totalPct={total} marketPct={market} stockPct={stock} indexSymbol="NIFTY 50" />
        <p className="text-[13px] text-text-3 sm:max-w-[22ch]">
          {sessions === 0 ? "Drag the dot back to see a gap open." : `${sessions} ${sessions === 1 ? "session" : "sessions"} between the dot and now. Drag it.`}
        </p>
      </div>
    </div>
  );
}
