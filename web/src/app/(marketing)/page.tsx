import Link from "next/link";
import { CtaLink } from "@/components/ui/cta-link";
import { DemoVideo } from "@/features/marketing/demo-video";
import { GrowwLove } from "@/features/marketing/groww-love";
import { LiveDemo } from "@/features/marketing/live-demo";
import { ProductTiles } from "@/features/marketing/product-tiles";
import { Reveal } from "@/features/marketing/reveal";
import { SiteFooter, SiteNav } from "@/features/marketing/site-nav";

export default function LandingPage() {
  return (
    <>
      <SiteNav />

      {/* Hero — centred, washed by the blue→yellow glow. Awake's opening. */}
      <section className="hero-glow w-full overflow-x-clip pb-16 pt-40 sm:pt-44 2xl:pb-20">
        <div className="relative z-10 mx-auto flex w-full max-w-[1000px] flex-col items-center gap-8 px-5 text-center sm:px-8">
          <div className="flex flex-col items-center gap-4">
            <h1 className="display text-balance text-[48px] leading-[1.02] sm:text-[64px] lg:text-[80px]">
              What changed <span className="serif-accent text-text-2">since</span> you last looked<span className="text-iris">.</span>
            </h1>
            <p className="max-w-[52ch] text-[17px] leading-relaxed text-text-2">
              A watchlist that remembers when you left. Open it after a few days and it tells you what moved, why, and whether it matters to you — ranked and cited, or read aloud.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <CtaLink href="/sign-up" tone="iris" className="w-full max-w-64 text-[15px] sm:w-auto">
              Get started free
            </CtaLink>
            <Link
              href="#try"
              className="inline-flex h-[54px] items-center justify-center rounded-full border border-ink bg-transparent px-7 text-[15px] font-medium text-text transition-colors duration-200 hover:bg-ink hover:text-white"
            >
              Try the demo
            </Link>
          </div>
        </div>
      </section>

      {/* The film — the whole product in two minutes, before you touch the demo. */}
      <section className="mx-auto w-full max-w-[1200px] px-5 pb-24 sm:px-8">
        <Reveal>
          <div className="mx-auto mb-10 max-w-[680px] text-center">
            <p className="label text-text-3">The film</p>
            <h2 className="display mt-3 text-balance text-[36px] leading-[1.04] sm:text-[48px]">
              Watch a week away become <span className="serif-accent text-text-2">one calm catch-up.</span>
            </h2>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <DemoVideo />
        </Reveal>
      </section>

      {/* The demo is the product: the real catch-up card, four companies, canned data. */}
      <section id="try" className="mx-auto w-full max-w-[1200px] px-5 pb-24 sm:px-8">
        <Reveal>
          <div className="mb-12 grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
            {/* The gap, drawn: grey while you watched, iris while you were away. */}
            <div className="relative order-last px-2 py-6 lg:order-first" aria-hidden>
              <svg viewBox="0 0 440 190" fill="none" className="h-auto w-full">
                <defs>
                  <linearGradient id="gap-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#4928fd" stopOpacity="0.14" />
                    <stop offset="1" stopColor="#4928fd" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M160 120 L200 98 L240 108 L280 72 L320 86 L360 56 L400 66 L428 38 L428 190 L160 190 Z" fill="url(#gap-fill)" />
                <line x1="160" y1="16" x2="160" y2="178" stroke="rgba(27,29,30,0.12)" strokeDasharray="3 5" />
                <path d="M4 126 L44 116 L84 128 L124 108 L160 120" stroke="rgba(27,29,30,0.28)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <path d="M160 120 L200 98 L240 108 L280 72 L320 86 L360 56 L400 66 L428 38" stroke="#4928fd" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx="160" cy="120" r="4.5" fill="#ffffff" stroke="rgba(27,29,30,0.45)" strokeWidth="2" />
                <circle cx="428" cy="38" r="5.5" fill="#4928fd" />
              </svg>
              {/* labels live on the line itself */}
              <span className="absolute left-[36%] top-[68%] inline-flex -translate-x-1/2 items-center rounded-full border border-line bg-white/90 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.07em] text-ink shadow-card backdrop-blur">
                You left · 28 Aug
              </span>
              <span className="absolute right-[4%] top-[14%] inline-flex -translate-y-full items-center rounded-full bg-iris px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.07em] text-white shadow-float">
                You&rsquo;re back · today
              </span>
            </div>

            <div>
              <span className="inline-flex h-8 items-center gap-2.5 rounded-full bg-ink px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                <span className="size-1.5 rounded-full bg-iris" aria-hidden /> The demo
              </span>
              <h2 className="display mt-5 text-balance text-[38px] leading-[1.03] sm:text-[50px]">
                This is what coming back <span className="serif-accent text-text-2">looks like.</span>
              </h2>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {["The move", "What changed", "30-second read"].map((part) => (
                  <span key={part} className="inline-flex h-7 items-center rounded-full border border-line bg-white/70 px-3 text-[10.5px] font-bold uppercase tracking-[0.07em] text-ink">
                    {part}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <LiveDemo />
        </Reveal>
      </section>

      {/* Product tiles */}
      <section className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <Reveal>
          <div className="mx-auto mb-10 max-w-[680px] text-center">
            <p className="label text-text-3">What you get</p>
            <h2 className="display mt-3 text-balance text-[36px] leading-[1.04] sm:text-[48px]">
              Ranked, spoken, <span className="serif-accent text-text-2">sourced.</span>
            </h2>
          </div>
        </Reveal>
      </section>
      <ProductTiles />

      {/* The credit: a chart that ends in love. */}
      <GrowwLove />

      <SiteFooter />
    </>
  );
}
