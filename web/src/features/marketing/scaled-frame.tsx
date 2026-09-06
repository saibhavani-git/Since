"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";

/**
 * Renders children at a fixed design size and scales the whole frame to fit
 * the container's width. Lets the product reel be laid out in real pixels and
 * still fit a phone.
 */
export function ScaledFrame({ width, height, children, className }: { width: number; height: number; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry?.contentRect.width ?? width;
      setScale(Math.min(1, w / width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    /* The inner frame is absolutely positioned so its fixed width never inflates a grid track's min-content. */
    <div ref={ref} className={cx("relative min-w-0", className)} style={{ height: height * scale }}>
      <div className="absolute left-0 top-0" style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}
