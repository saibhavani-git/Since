import { cx } from "@/lib/cx";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded-[12px] bg-canvas-2", className)} />;
}
