"use client";

import { useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cx } from "@/lib/cx";
import { dateLabel, pct, rupees, shortStamp } from "@/lib/format";

export interface GapPoint {
  t: string;
  c: number;
}

/**
 * The Since chart. Solid line up to the moment you last looked, an iris dot
 * there, a dotted line across the gap, solid again at now. Colour comes from
 * the gap's direction, never from the whole series. Hover (or touch) any
 * point and a crosshair tells you the close and how far it is from "you".
 */
export function GapChart({
  series,
  sinceIndex,
  height = 120,
  onInk = false,
  showLabels = true,
  interactive = true,
  fill = false,
  className,
}: {
  series: GapPoint[];
  sinceIndex: number;
  height?: number;
  onInk?: boolean;
  showLabels?: boolean;
  interactive?: boolean;
  /** Stretch into a parent with an explicit height instead of preserving the chart aspect ratio. */
  fill?: boolean;
  className?: string;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = height;
  const padX = 6;
  const padY = 12;

  const model = useMemo(() => {
    if (series.length < 2) return null;
    const closes = series.map((p) => p.c);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const x = (i: number) => padX + (i / (series.length - 1)) * (W - padX * 2);
    const y = (v: number) => padY + (1 - (v - min) / span) * (H - padY * 2);
    const path = (from: number, to: number) =>
      series
        .slice(from, to + 1)
        .map((p, i) => `${i === 0 ? "M" : "L"}${x(from + i).toFixed(1)},${y(p.c).toFixed(1)}`)
        .join(" ");
    const s = Math.min(Math.max(sinceIndex, 0), series.length - 1);
    const then = series[s]!.c;
    const now = series[series.length - 1]!.c;
    const all = path(0, series.length - 1);
    return {
      x,
      y,
      before: path(0, s),
      gap: path(s, series.length - 1),
      area: `${all} L${x(series.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`,
      dot: { x: x(s), y: y(then) },
      end: { x: x(series.length - 1), y: y(now) },
      dir: now > then ? "rise" : now < then ? "fall" : "flat",
      sinceAt: series[s]!.t,
      then,
      s,
    };
  }, [series, sinceIndex, H]);

  if (!model) return <div className={cx("rounded-sm bg-canvas-2", className)} style={{ height }} />;

  const stroke = onInk
    ? model.dir === "rise"
      ? "var(--color-rise-on-ink)"
      : model.dir === "fall"
        ? "var(--color-fall-on-ink)"
        : "var(--color-text-on-ink-2)"
    : model.dir === "rise"
      ? "var(--color-rise)"
      : model.dir === "fall"
        ? "var(--color-fall)"
        : "var(--color-text-3)";
  const beforeStroke = onInk ? "var(--color-text-on-ink-3)" : "var(--color-market)";
  const dotFill = onInk ? "var(--color-iris-on-ink)" : "var(--color-iris)";
  const gridStroke = onInk ? "var(--color-ink-line)" : "rgba(25, 26, 23, 0.09)";
  const areaColor =
    model.dir === "rise"
      ? onInk ? "var(--color-rise-on-ink)" : "var(--color-rise)"
      : model.dir === "fall"
        ? onInk ? "var(--color-fall-on-ink)" : "var(--color-fall)"
        : onInk ? "var(--color-iris-on-ink)" : "var(--color-iris)";

  const onMove = (e: React.PointerEvent) => {
    if (!interactive || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHover(Math.round(f * (series.length - 1)));
  };

  const h = hover !== null ? series[hover] : null;
  const hx = hover !== null ? model.x(hover) : 0;
  const hy = h ? model.y(h.c) : 0;
  const delta = h ? ((h.c - model.then) / model.then) * 100 : 0;

  return (
    <figure ref={box} className={cx("relative w-full select-none", fill && "h-full", interactive && "cursor-crosshair", className)} aria-label="Price before and since you last looked" onPointerDown={onMove} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className={cx("block w-full overflow-visible", fill ? "h-full" : "h-auto")} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`${id}-fade`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={beforeStroke} stopOpacity="0" />
            <stop offset="0.35" stopColor={beforeStroke} stopOpacity="1" />
          </linearGradient>
          <linearGradient id={`${id}-area`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={areaColor} stopOpacity="0.24" />
            <stop offset="0.72" stopColor={areaColor} stopOpacity="0.07" />
            <stop offset="1" stopColor={areaColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={model.area}
          fill={`url(#${id}-area)`}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden
        />
        <g aria-hidden>
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line key={fraction} x1={padX} x2={W - padX} y1={H * fraction} y2={H * fraction} stroke={gridStroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
        </g>
        <path d={model.before} fill="none" stroke={`url(#${id}-fade)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <motion.path
          d={model.gap}
          fill="none"
          stroke={stroke}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2 7"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 0.15 }}
        />
        <motion.circle
          cx={model.end.x}
          cy={model.end.y}
          r="4"
          fill={stroke}
          initial={reduce ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.95, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: `${model.end.x}px ${model.end.y}px` }}
        />
        <motion.circle
          cx={model.dot.x}
          cy={model.dot.y}
          r="5.5"
          fill={dotFill}
          stroke={onInk ? "var(--color-ink)" : "var(--color-surface)"}
          strokeWidth="2.5"
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: `${model.dot.x}px ${model.dot.y}px` }}
        />
        {h ? (
          <>
            <line x1={hx} x2={hx} y1={0} y2={H} stroke={onInk ? "var(--color-ink-line-2)" : "var(--color-line-2)"} strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
            <circle cx={hx} cy={hy} r="4.5" fill={onInk ? "var(--color-ink)" : "var(--color-surface)"} stroke={hover! >= model.s ? stroke : beforeStroke} strokeWidth="2" />
          </>
        ) : null}
      </svg>

      {h ? (
        <div
          className={cx(
            "pointer-events-none absolute top-0 z-10 -translate-y-full whitespace-nowrap rounded-[11px] border px-3 py-2 text-[12px] leading-tight num shadow-none",
            onInk ? "border-line bg-surface text-text" : "border-white/10 bg-ink text-text-on-ink",
          )}
          style={{ left: `${(hx / W) * 100}%`, transform: `translate(${hx / W > 0.75 ? "-100%" : hx / W < 0.25 ? "0%" : "-50%"}, calc(-100% - 6px))` }}
        >
          <span className={cx("block text-[10px] font-medium uppercase tracking-[0.05em]", onInk ? "text-text-3" : "text-text-on-ink-3")}>{dateLabel(h.t)}</span>
          <span className="mt-1 flex items-baseline gap-2">
            <span className="text-[13px] font-semibold">{rupees(h.c, { decimals: true })}</span>
            {hover! !== model.s ? (
              <span className={cx("text-[11px]", delta > 0 ? (onInk ? "text-rise-strong" : "text-rise-on-ink") : delta < 0 ? (onInk ? "text-fall-strong" : "text-fall-on-ink") : "")}>
                {pct(delta)} since your last look
              </span>
            ) : (
              <span className={cx("text-[11px]", onInk ? "text-iris" : "text-iris-on-ink")}>your last look</span>
            )}
          </span>
        </div>
      ) : null}

      {showLabels ? (
        <figcaption className="pointer-events-none absolute inset-x-0 -bottom-5 flex justify-between">
          <span className={cx("label", onInk ? "text-iris-on-ink" : "text-iris")} style={{ marginLeft: `calc(${(model.dot.x / W) * 100}% - 1.5em)` }}>
            you · {shortStamp(model.sinceAt)}
          </span>
          <span className={cx("label", onInk ? "text-text-on-ink-3" : "text-text-3")}>now</span>
        </figcaption>
      ) : null}
    </figure>
  );
}
