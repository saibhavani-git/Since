"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cx } from "@/lib/cx";

/** Reveals text one character at a time. Re-keys to replay. */
export function Typewriter({ text, cps = 38, delay = 0, className }: { text: string; cps?: number; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) return;
    let i = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      timer = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length && timer) clearInterval(timer);
      }, 1000 / cps);
    }, delay * 1000);
    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, [text, cps, delay, reduce]);
  return (
    <span className={className}>
      {text.slice(0, n)}
      {n < text.length ? <span className="inline-block w-[0.5em] -mb-[2px] h-[1em] bg-current opacity-60 animate-pulse align-middle" /> : null}
    </span>
  );
}

/** Reveals a sentence word by word with a soft rise. */
export function Words({ text, delay = 0, stagger = 0.06, className }: { text: string; delay?: number; stagger?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={cx("inline", className)}>
      {text.split(" ").map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          className="inline-block mr-[0.25em]"
          initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, delay: delay + i * stagger, ease: [0.16, 1, 0.3, 1] }}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}
