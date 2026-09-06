import { cx } from "@/lib/cx";

export type Tone = "neutral" | "outline" | "rise" | "fall" | "iris" | "stale" | "ink";

/**
 * A proper pill: fully round, 26px tall, medium weight. Filled tints for
 * signals, an outline for facts, ink for the one thing that must be seen.
 */
const tones: Record<Tone, string> = {
  neutral: "bg-canvas-2 text-text-2",
  outline: "bg-surface text-text-2 border border-line-2",
  rise: "bg-rise-tint text-rise-strong",
  fall: "bg-fall-tint text-fall-strong",
  iris: "bg-iris-tint text-iris-strong",
  stale: "bg-stale-tint text-stale",
  ink: "bg-ink text-white",
};

const dots: Partial<Record<Tone, string>> = { rise: "bg-rise", fall: "bg-fall", iris: "bg-iris", stale: "bg-stale" };

export function Pill({
  tone = "neutral",
  mono,
  dot,
  size = "md",
  className,
  children,
}: {
  tone?: Tone;
  mono?: boolean;
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap num",
        size === "sm" ? "h-[22px] px-2 text-[11px]" : "h-[26px] px-2.5 text-[12px]",
        mono && "font-mono tracking-[0.01em]",
        tones[tone],
        className,
      )}
    >
      {dot ? <span aria-hidden className={cx("size-1.5 rounded-full", dots[tone] ?? "bg-current")} /> : null}
      {children}
    </span>
  );
}

/** Tone from a signed number: rise / fall / neutral. */
export const toneOf = (n: number, eps = 0.0001): Tone => (n > eps ? "rise" : n < -eps ? "fall" : "neutral");
