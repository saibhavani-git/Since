import Link from "next/link";
import { cx } from "@/lib/cx";

/**
 * The Awake signature CTA: a pill that empties on hover while the circled
 * arrow rotates 45°. Use for the one action a section is asking for.
 */
const tones = {
  iris: {
    pill: "bg-iris text-white border-iris hover:bg-transparent hover:text-iris",
    circle: "fill-white group-hover:fill-iris",
    arrow: "stroke-ink group-hover:stroke-white",
  },
  ink: {
    pill: "bg-ink text-white border-ink hover:bg-transparent hover:text-ink",
    circle: "fill-white group-hover:fill-ink",
    arrow: "stroke-ink group-hover:stroke-white",
  },
  white: {
    pill: "bg-white text-ink border-white hover:bg-transparent hover:text-white",
    circle: "fill-ink group-hover:fill-white",
    arrow: "stroke-white group-hover:stroke-ink",
  },
} as const;

export function CtaLink({
  href,
  children,
  tone = "ink",
  className,
}: {
  href: string;
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <Link
      href={href}
      className={cx(
        "group relative inline-flex items-center justify-between gap-4 overflow-hidden rounded-full border py-2 pl-6 pr-2 font-medium transition-all duration-200 ease-in-out",
        t.pill,
        className,
      )}
    >
      <span>{children}</span>
      <svg
        width="36"
        height="36"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transform transition-transform duration-200 ease-in-out group-hover:rotate-45"
        aria-hidden
      >
        <rect width="40" height="40" rx="20" className={cx("transition-colors duration-200 ease-in-out", t.circle)} />
        <path d="M15.832 15.3334H24.1654V23.6667" className={cx("transition-colors duration-200 ease-in-out", t.arrow)} strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15.832 23.6667L24.1654 15.3334" className={cx("transition-colors duration-200 ease-in-out", t.arrow)} strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
