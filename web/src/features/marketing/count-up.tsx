"use client";

import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/** Animates a number from 0 to `to` when mounted; renders via `format`. */
export function CountUp({ to, format, duration = 1, delay = 0, className }: { to: number; format: (n: number) => string; duration?: number; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? to : 0);
  const [text, setText] = useState(format(reduce ? to : 0));

  useEffect(() => {
    if (reduce) return;
    const unsub = mv.on("change", (v) => setText(format(v)));
    const ctrl = animate(mv, to, { duration, delay, ease: [0.16, 1, 0.3, 1] });
    return () => {
      unsub();
      ctrl.stop();
    };
  }, [to, duration, delay, format, mv, reduce]);

  return <span className={className}>{text}</span>;
}
