"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { cx } from "@/lib/cx";

const links = [
  { href: "/#try", label: "Try it" },
  { href: "/product", label: "Why Since" },
  { href: "/architecture", label: "Architecture" },
  { href: "/developers", label: "Developers" },
];

/**
 * Awake floating header: the nav sits in a soft pill; on scroll the whole
 * bar condenses into a white rounded-full card with a hairline shadow.
 */
export function SiteNav() {
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY >= 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-0 z-50 w-full">
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-3 sm:px-6">
        <nav
          className={cx(
            "flex items-center justify-between px-4 py-3 transition-all duration-300",
            sticky ? "rounded-full bg-white shadow-card" : "bg-transparent",
          )}
          aria-label="Site"
        >
          <Wordmark />
          <div className="hidden sm:flex items-center rounded-full bg-ink/5 p-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-full px-4 py-2 text-[15px] text-text-2 transition-colors hover:bg-white hover:text-text">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="hidden sm:block rounded-full border border-ink bg-transparent px-4 py-2 text-[14px] font-medium text-text transition-colors hover:bg-ink hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full border border-ink bg-ink px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-transparent hover:text-text"
            >
              Get started free
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

/** Static, plausible numbers for the footer tape — marketing chrome, not live data. */
const tape: [symbol: string, changePct: number][] = [
  ["GROWW", 2.9],
  ["SWIGGY", 4.0],
  ["NYKAA", -5.9],
  ["RELIANCE", 3.3],
  ["ZOMATO", -6.7],
  ["HDFCBANK", 0.6],
  ["TCS", -0.3],
  ["INFY", 0.2],
  ["TATAMOTORS", 1.8],
  ["SBIN", 0.4],
  ["BAJFINANCE", -1.2],
  ["ITC", 0.5],
];

export function SiteFooter() {
  const cols: { title: string; links: { label: string; href: string }[] }[] = [
    { title: "Product", links: [{ label: "Try it", href: "/#try" }, { label: "Why Since", href: "/product" }, { label: "Sign in", href: "/sign-in" }] },
    { title: "Developers", links: [{ label: "API", href: "/developers" }, { label: "Architecture", href: "/architecture" }, { label: "OpenAPI", href: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/openapi.json` }] },
    { title: "Company", links: [{ label: "About", href: "/product" }] },
  ];
  return (
    <footer className="overflow-hidden pt-20">
      {/* The thread — a quiet market line stitched across the page, ending in the dot. */}
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8" aria-hidden>
        <svg viewBox="0 0 1136 64" fill="none" preserveAspectRatio="none" className="h-14 w-full sm:h-16">
          <path
            d="M0 50 L96 40 L192 46 L288 30 L384 37 L480 22 L576 32 L672 16 L768 26 L864 12 L960 20 L1056 8 L1118 12"
            stroke="rgba(27, 29, 30, 0.14)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx="1118" cy="12" r="4.5" fill="#4928fd" />
        </svg>
      </div>

      {/* The tape — the watchlist drifting by. */}
      <div className="border-y border-line py-3.5" aria-hidden>
        <div className="flex w-max animate-[marquee_48s_linear_infinite] motion-reduce:animate-none">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {tape.map(([symbol, changePct]) => (
                <span key={`${copy}-${symbol}`} className="flex items-center gap-2 px-6">
                  <span className="font-mono text-[11.5px] tracking-wide text-text-3">{symbol}</span>
                  <span className={cx("text-[12px] font-semibold num", changePct > 0 ? "text-rise-strong" : changePct < 0 ? "text-fall-strong" : "text-text-3")}>
                    {changePct > 0 ? "+" : ""}
                    {changePct.toFixed(1)}%
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-10 py-14 xl:flex-row">
          <div className="flex max-w-md flex-col gap-5">
            <Wordmark size="md" />
            <p className="max-w-[36ch] text-[15px] leading-relaxed text-text-2">
              What changed <span className="serif-accent">since</span> you last looked. Market data is delayed. Nothing here is investment advice.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3 sm:gap-16">
            {cols.map((c) => (
              <div key={c.title} className="flex flex-col gap-4">
                <p className="text-[15px] font-medium">{c.title}</p>
                <ul className="flex flex-col gap-3">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-[14px] text-text-2 transition-colors hover:text-text">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-2 border-t border-line py-6 text-[13px] text-text-2 sm:flex-row">
          <span>© 2026 Since. All rights reserved.</span>
          <span>Built for the Groww hackathon</span>
        </div>
      </div>
    </footer>
  );
}
