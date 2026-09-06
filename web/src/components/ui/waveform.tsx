"use client";

import { motion, useReducedMotion } from "motion/react";
import { cx } from "@/lib/cx";

/** Speaking indicator: bars breathing at staggered phases. */
export function Waveform({ bars = 24, className, color = "currentColor", playing = true }: { bars?: number; className?: string; color?: string; playing?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className={cx("flex h-8 items-center gap-[3px]", className)} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const base = 0.25 + 0.6 * Math.abs(Math.sin(i * 0.9));
        return (
          <motion.span
            key={i}
            className="w-[3px] rounded-full"
            style={{ background: color, height: "100%", originY: 0.5 }}
            animate={playing && !reduce ? { scaleY: [base * 0.4, base, base * 0.55, base * 0.9, base * 0.4] } : { scaleY: 0.25 }}
            transition={{ duration: 1.1 + (i % 5) * 0.13, repeat: Infinity, ease: "easeInOut", delay: i * 0.04 }}
          />
        );
      })}
    </div>
  );
}
