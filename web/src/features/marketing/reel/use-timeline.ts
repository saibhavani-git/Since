"use client";

import { useEffect, useState } from "react";

export interface TimelineStep<K extends string> {
  key: K;
  /** How long this step stays on screen, ms. */
  ms: number;
}

/**
 * Steps through a scripted sequence and loops. Pauses when the tab is hidden
 * or `active` is false (e.g. the reel is scrolled out of view).
 */
export function useTimeline<K extends string>(steps: readonly TimelineStep<K>[], active = true): { step: K; index: number; cycle: number } {
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      timer = setTimeout(() => {
        if (document.hidden) return schedule();
        setIndex((i) => {
          const next = (i + 1) % steps.length;
          if (next === 0) setCycle((c) => c + 1);
          return next;
        });
      }, steps[index]!.ms);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [index, steps, active]);

  return { step: steps[index]!.key, index, cycle };
}
