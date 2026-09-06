"use client";

import { useMemo, useState } from "react";
import { cx } from "@/lib/cx";
import { dateLabel, rupees } from "@/lib/format";

export interface PricePoint {
  t: string;
  c: number;
}

/**
 * Closing-price line with a hover crosshair. Colour is the range's direction.
 * Pointer handling is a single listener on the svg; no per-point elements.
 */
const W = 800;
const pad = { x: 4, top: 16, bottom: 24 };

export function PriceChart({ points, height = 240, className }: { points: PricePoint[]; height?: number; className?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const H = height;

  const m = useMemo(() => {
    if (points.length < 2) return null;
    const closes = points.map((p) => p.c);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const x = (i: number) => pad.x + (i / (points.length - 1)) * (W - pad.x * 2);
    const y = (v: number) => pad.top + (1 - (v - min) / span) * (H - pad.top - pad.bottom);
    const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join(" ");
    const first = closes[0]!;
    const last = closes[closes.length - 1]!;
    return { x, y, d, min, max, dir: last >= first ? "rise" : "fall", minI: closes.indexOf(min), maxI: closes.indexOf(max) };
  }, [points, H]);

  if (!m) return <div className={cx("rounded-sm bg-canvas-2", className)} style={{ height }} />;

  const stroke = m.dir === "rise" ? "var(--color-rise)" : "var(--color-fall)";
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - r.left) / r.width;
    setHover(Math.round(Math.min(1, Math.max(0, rel)) * (points.length - 1)));
  };
  const h = hover !== null ? points[hover] : null;

  return (
    <div className={cx("relative", className)}>
      <div className="mb-2 flex h-5 items-baseline justify-between text-[13px] num">
        {h ? (
          <>
            <span className="font-medium text-text">{rupees(h.c, { decimals: true })}</span>
            <span className="text-text-3">{dateLabel(h.t)}</span>
          </>
        ) : (
          <>
            <span className="text-text-3">
              low <span className="text-text-2">{rupees(m.min, { decimals: true })}</span>
            </span>
            <span className="text-text-3">
              high <span className="text-text-2">{rupees(m.max, { decimals: true })}</span>
            </span>
          </>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block w-full touch-pan-y"
        style={{ height }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <line x1={pad.x} x2={W - pad.x} y1={m.y(m.max)} y2={m.y(m.max)} stroke="var(--color-line)" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
        <line x1={pad.x} x2={W - pad.x} y1={m.y(m.min)} y2={m.y(m.min)} stroke="var(--color-line)" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
        <path d={m.d} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {hover !== null ? (
          <>
            <line x1={m.x(hover)} x2={m.x(hover)} y1={pad.top} y2={H - pad.bottom} stroke="var(--color-line-2)" vectorEffect="non-scaling-stroke" />
            <circle cx={m.x(hover)} cy={m.y(points[hover]!.c)} r="4.5" fill={stroke} stroke="var(--color-surface)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </>
        ) : null}
      </svg>
      <div className="mt-1 flex justify-between label text-text-3">
        <span>{dateLabel(points[0]!.t)}</span>
        <span>{dateLabel(points[points.length - 1]!.t)}</span>
      </div>
    </div>
  );
}
