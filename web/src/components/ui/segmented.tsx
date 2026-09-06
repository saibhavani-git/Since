"use client";

import { cx } from "@/lib/cx";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Radio-group styled as a pill segmented control. Keyboard: arrows move, per WAI-ARIA radiogroup. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  block = false,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly SegmentedOption<T>[];
  size?: "sm" | "md";
  /** Fill the container and share the width equally between options. */
  block?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const idx = options.findIndex((o) => o.value === value);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (idx + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
    onChange(options[next]!.value);
  };
  return (
    <div role="radiogroup" aria-label={ariaLabel} onKeyDown={onKey} className={cx("rounded-full bg-ink/5 p-1", block ? "flex w-full" : "inline-flex", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cx(
              "rounded-full font-medium transition-colors num",
              block && "flex-1",
              size === "sm" ? "h-7 px-3 text-[12px]" : block ? "h-10 px-3.5 text-[14px]" : "h-8 px-3.5 text-[13px]",
              active ? "bg-ink text-white" : "text-text-2 hover:text-text",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
