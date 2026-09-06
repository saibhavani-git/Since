import Link from "next/link";
import { cx } from "@/lib/cx";

/**
 * `since` in Inter Tight 600 with the iris dot on the baseline — the same
 * dot that marks *you* on every chart. Live text, never an image.
 */
export function Wordmark({ className, href = "/", size = "md" }: { className?: string; href?: string | null; size?: "sm" | "md" | "lg" }) {
  const text = { sm: "text-[20px]", md: "text-[24px]", lg: "text-[40px]" }[size];
  const dot = { sm: "size-[5px] ml-[2px]", md: "size-[6px] ml-[2px]", lg: "size-[10px] ml-[3px]" }[size];
  const inner = (
    <span className={cx("inline-flex items-baseline font-wordmark font-semibold tracking-[-0.06em] leading-none", text, className)} aria-label="since">
      since
      <span aria-hidden className={cx("inline-block rounded-full bg-iris translate-y-[-1px]", dot)} />
    </span>
  );
  return href ? (
    <Link href={href} className="rounded-md">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function Mark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="currentColor" />
      <path d="M13 41H27" stroke="var(--color-text)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M27 41L38 25" stroke="var(--color-text)" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="0.1 7.5" opacity=".6" />
      <path d="M38 25H51" stroke="var(--color-text)" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="27" cy="41" r="5" fill="var(--color-iris)" />
    </svg>
  );
}
