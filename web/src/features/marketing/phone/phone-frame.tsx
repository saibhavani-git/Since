"use client";

import { cx } from "@/lib/cx";
import { ScaledFrame } from "../scaled-frame";

export const SCREEN_W = 390;
export const SCREEN_H = 800;
const BEZEL = 12;
const SIDE = 6; /* room for the side keys */

/**
 * A phone, drawn flat. Graphite bezel with a single inner highlight, side
 * keys, an island. No glare, no drop shadow. The screen is laid out at real
 * pixels and scaled to fit its column.
 */
export function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ScaledFrame width={SCREEN_W + BEZEL * 2 + SIDE * 2} height={SCREEN_H + BEZEL * 2} className={cx("mx-auto w-full max-w-[426px]", className)}>
      <div className="relative h-full w-full" style={{ padding: `0 ${SIDE}px` }}>
        {/* side keys */}
        <span aria-hidden className="absolute left-[2px] top-[150px] h-[34px] w-[4px] rounded-l-[2px] bg-ink-raised-2" />
        <span aria-hidden className="absolute left-[2px] top-[210px] h-[64px] w-[4px] rounded-l-[2px] bg-ink-raised-2" />
        <span aria-hidden className="absolute left-[2px] top-[290px] h-[64px] w-[4px] rounded-l-[2px] bg-ink-raised-2" />
        <span aria-hidden className="absolute right-[2px] top-[236px] h-[100px] w-[4px] rounded-r-[2px] bg-ink-raised-2" />

        <div className="relative h-full w-full rounded-[60px] bg-ink p-[12px] ring-1 ring-black/20">
          <div aria-hidden className="pointer-events-none absolute inset-[3px] rounded-[57px] ring-1 ring-white/[0.07]" />
          <div className="relative h-full w-full overflow-hidden rounded-[48px] bg-canvas text-text">
            <div aria-hidden className="absolute left-1/2 top-[14px] z-20 h-[30px] w-[108px] -translate-x-1/2 rounded-full bg-ink" />
            {children}
            <div aria-hidden className="absolute bottom-[8px] left-1/2 z-20 h-[5px] w-[132px] -translate-x-1/2 rounded-full bg-ink/80" />
          </div>
        </div>
      </div>
    </ScaledFrame>
  );
}
