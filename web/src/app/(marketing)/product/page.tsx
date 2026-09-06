import type { Metadata } from "next";
import Link from "next/link";
import { CtaLink } from "@/components/ui/cta-link";
import { Reveal } from "@/features/marketing/reveal";
import { SiteFooter, SiteNav } from "@/features/marketing/site-nav";
import { cx } from "@/lib/cx";

export const metadata: Metadata = {
  title: "Why we built Since",
  description: "The thinking behind Since: why a watchlist should want you to leave.",
};

/**
 * The thought process, argued visually. Each section is one idea: a short
 * passage of prose and a drawn artifact that makes the same point without
 * words. Someone who only scrolls still gets the whole argument.
 */
export default function ProductPage() {
  return (
    <div className="bg-surface overflow-x-clip">
      <SiteNav />
      <main className="hero-glow mx-auto w-full max-w-[980px] px-5 pb-24 pt-36 sm:px-8 sm:pt-44">
        <p className="label text-text-3">Product</p>
        <h1 className="display mt-4 text-balance text-[44px] leading-[0.98] sm:text-[64px]">
          Why we built a watchlist that wants you to <span className="serif-accent text-text-2">leave.</span>
        </h1>
        <p className="mt-6 max-w-[58ch] text-[17px] leading-relaxed text-text-2">
          Every investing app already has a watchlist. The problem was never the data — it was the question the screen answers.
          This page is the thinking, with the numbers and pictures that shaped it.
        </p>

        {/* ------------------------------------------------------------------ */}
        {/* 1 · The two questions, drawn                                        */}
        {/* ------------------------------------------------------------------ */}
        <Reveal className="mt-16">
          <div className="grid gap-4 lg:grid-cols-2">
            <TheTable />
            <TheGlimpse />
          </div>
        </Reveal>

        <Section title="The world we saw">
          <p>
            Open any broker, any tracker, and the watchlist is the same artifact: a table. Names, a live price, a day-change
            percentage breathing red and green. It answers one question — <em>what is the price right now?</em> — forty times a
            day, whether or not anything happened.
          </p>
          <p>
            But nobody returns from three days away wondering what the price is this second. They wonder what they{" "}
            <em>missed</em>: did anything happen, does it matter, do I need to care? The table has no memory. It doesn&rsquo;t
            know you were gone. So people scroll the colours, skim a news tab written for clicks, and leave knowing roughly
            nothing — until a vague unease sends them back an hour later. Checking becomes a tic that pays nothing.
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        {/* 2 · The market, in four tiles                                       */}
        {/* ------------------------------------------------------------------ */}
        <Reveal className="mt-14">
          <p className="label text-text-3">The market this is happening in</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.figure} className={cx("flex flex-col rounded-[24px] p-6", s.tint)}>
                <p className="display num text-[40px] leading-none text-ink">{s.figure}</p>
                <p className="mt-3 text-[13.5px] leading-snug text-ink/80">{s.what}</p>
                <p className="mt-3 font-mono text-[10.5px] tracking-wide text-ink/50">{s.source}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Section title="What those numbers say together">
          <p>
            India&rsquo;s investor base has grown five-fold in seven years, and its median member is 33 — someone who got their
            first demat account and their Instagram account in the same era of their life. They are surrounded by more market
            content than any investor generation in history, and the one rigorous study of what that stimulation produces is
            brutal: when retail attention turns into retail action in derivatives, nine in ten lose. These people don&rsquo;t
            need more information — every app is already a firehose. They need <em>settlement</em>: to come back from living
            their life and know, in under a minute, whether anything deserves their attention.
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        {/* 3 · The gap, drawn                                                  */}
        {/* ------------------------------------------------------------------ */}
        <Section title="The question we chose to answer">
          <p>
            We built the entire product around the sentence people actually think when they open the app:{" "}
            <span className="font-medium text-text">what changed since I last looked?</span> Taking those words literally
            decided everything. &ldquo;Since I last looked&rdquo; means the app must remember when you left — so it does, to the
            second, with the prices that were on your screen. &ldquo;What changed&rdquo; means judged change, not raw movement —
            a 2% week is loud for HDFC Bank and silence for a small-cap.
          </p>
        </Section>

        <Reveal className="mt-8">
          <TheGap />
        </Reveal>

        {/* ------------------------------------------------------------------ */}
        {/* 4 · The inversion                                                   */}
        {/* ------------------------------------------------------------------ */}
        <Reveal className="my-16 sm:my-20">
          <p className="display mx-auto max-w-[20ch] text-center text-[36px] leading-[1.05] sm:text-[52px]">
            Short-form, <span className="serif-accent text-text-2">with the incentive reversed.</span>
          </p>
        </Reveal>

        <Reveal>
          <div className="grid gap-4 lg:grid-cols-2">
            <TheirFeed />
            <OurFeed />
          </div>
        </Reveal>

        <Section title="The reels observation, honestly">
          <p>
            The behavioural fact we couldn&rsquo;t ignore: 89% of India&rsquo;s Gen Z uses Reels daily. This generation is
            fluent in a grammar — a card, a swipe, a voice over a moving image, a story that makes its point in under a minute.
            Most finance products pretend that grammar doesn&rsquo;t exist and serve tables. The ones that adopt it usually
            adopt its business model too, and become engagement machines that profit from you never leaving.
          </p>
          <p>
            We took a third path: borrow the grammar, reverse the incentive. The catch-up looks like the short-form this
            generation already knows — cards you flick through, a narrator, charts that draw themselves — but it is short so you
            can <em>leave</em>, not short so you stay. The feed ends. No infinite scroll, no autoplay into someone&rsquo;s hot
            take, no streak. Opening Since twice in ten minutes doesn&rsquo;t manufacture a new digest to keep you engaged — it
            shows the same one, because nothing changed and saying so is the honest answer. A product that wants your attention
            builds a slot machine. A product that respects it builds a doorman: <em>nothing for you today, go enjoy your
            evening.</em>
          </p>
        </Section>

        {/* ------------------------------------------------------------------ */}
        {/* 5 · Thought → product                                               */}
        {/* ------------------------------------------------------------------ */}
        <Section title="How the thinking became the product">
          <ul className="grid gap-3 sm:grid-cols-2">
            {DECISIONS.map((d) => (
              <li key={d.chip} className="rounded-[24px] border border-line bg-surface p-6">
                <span className={cx("inline-flex h-7 items-center rounded-full px-3 text-[11px] font-bold uppercase tracking-[0.07em] text-ink", d.tint)}>
                  {d.chip}
                </span>
                <p className="display mt-3 text-[18px]">&ldquo;{d.thought}&rdquo;</p>
                <p className="mt-2 text-[14px] leading-relaxed text-text-2">{d.became}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Where we think this goes">
          <p>
            The web app is one rendering of this idea — the first customer of its own engine. The digest itself is an API: any
            broker or portfolio app can hand us a watchlist and get back the same ranked, cited, narrated answer for their own
            users. If the thesis is right — that the next hundred million investors need a calm answer more than a faster ticker
            — then the watchlist that wants you to leave belongs everywhere a watchlist exists today.
          </p>
        </Section>

        <div className="mt-16 flex flex-col items-center gap-6 border-t border-line pt-12 text-center">
          <p className="display text-balance text-[32px] leading-[1.05] sm:text-[40px]">
            Check less. <span className="serif-accent text-text-2">Know more.</span>
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <CtaLink href="/#try" tone="iris" className="text-[15px]">
              Try the demo
            </CtaLink>
            <Link
              href="/architecture"
              className="inline-flex h-[54px] items-center justify-center rounded-full border border-ink bg-transparent px-7 text-[15px] font-medium text-text transition-colors duration-200 hover:bg-ink hover:text-white"
            >
              Read how it&rsquo;s built
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Drawn artifacts                                                             */
/* -------------------------------------------------------------------------- */

const TABLE_ROWS: [string, string, number][] = [
  ["RELIANCE", "1,322.00", 3.3],
  ["TCS", "2,304.00", -0.3],
  ["HDFCBANK", "1,689.50", 0.6],
  ["ZOMATO", "212.40", -6.7],
  ["INFY", "1,432.10", 0.2],
  ["NYKAA", "164.85", -5.9],
  ["SBIN", "802.30", 0.4],
  ["ITC", "418.65", 0.5],
];

/** Every watchlist today: a table with no memory. */
function TheTable() {
  return (
    <figure className="flex flex-col">
      <div className="flex-1 rounded-[24px] border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between px-1 pb-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-text-3">Every app today</span>
          <span className="font-mono text-[10.5px] text-text-3">LIVE</span>
        </div>
        <ul className="divide-y divide-line rounded-[14px] border border-line">
          {TABLE_ROWS.map(([sym, price, pct]) => (
            <li key={sym} className="flex items-center justify-between px-3.5 py-2.5">
              <span className="font-mono text-[11.5px] tracking-wide text-text-2">{sym}</span>
              <span className="flex items-center gap-3">
                <span className="num text-[12.5px] text-text-2">₹{price}</span>
                <span className={cx("num w-[52px] text-right text-[12px] font-semibold", pct > 0 ? "text-rise-strong" : "text-fall-strong")}>
                  {pct > 0 ? "+" : ""}
                  {pct.toFixed(1)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-3 px-2 text-center text-[13.5px] leading-snug text-text-2">
        Answers: <em>what is the price right now?</em>
        <span className="block text-[12.5px] text-text-3">No memory. Everything shouts equally.</span>
      </figcaption>
    </figure>
  );
}

/** The same market, answered by Since: a verdict and one earned card. */
function TheGlimpse() {
  return (
    <figure className="flex flex-col">
      <div className="flex flex-1 flex-col rounded-[24px] border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between px-1 pb-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-text-3">Since</span>
          <span className="font-mono text-[10.5px] text-text-3">3 SESSIONS AGO → NOW</span>
        </div>
        <p className="display px-1 text-[22px] leading-tight">Two things are worth a look.</p>
        <div className="mt-4 rounded-[16px] border border-line bg-canvas-2/60 p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[13.5px] font-semibold text-text">Reliance Industries</p>
            <p className="num text-[13px] font-semibold text-rise-strong">+3.3%</p>
          </div>
          <p className="mt-1.5 text-[13px] leading-snug text-text-2">Board approved a ₹15,000 crore buyback; retail arm to list by March.</p>
          <Sparkline />
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex h-6 items-center rounded-full bg-iris px-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white">Your thesis</span>
            <span className="inline-flex h-6 items-center rounded-full border border-line bg-white px-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-ink">2.9σ move</span>
            <span className="inline-flex h-6 items-center rounded-full border border-line bg-white px-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-ink">2 sources</span>
          </div>
        </div>
        <p className="mt-auto px-1 pt-4 text-[12.5px] text-text-3">…and 9 stocks were quiet. Filed away, not shown off.</p>
      </div>
      <figcaption className="mt-3 px-2 text-center text-[13.5px] leading-snug text-text-2">
        Answers: <em>what changed since you left?</em>
        <span className="block text-[12.5px] text-text-3">Remembers when you left. Ranks what mattered.</span>
      </figcaption>
    </figure>
  );
}

function Sparkline() {
  return (
    <svg viewBox="0 0 280 44" fill="none" className="mt-3 h-11 w-full" aria-hidden>
      <defs>
        <linearGradient id="glimpse-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4928fd" stopOpacity="0.16" />
          <stop offset="1" stopColor="#4928fd" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M2 34 L36 30 L70 32 L104 24 L138 27 L172 14 L206 18 L240 8 L278 10 L278 44 L2 44 Z" fill="url(#glimpse-fill)" />
      <path d="M2 34 L36 30 L70 32 L104 24 L138 27 L172 14 L206 18 L240 8 L278 10" stroke="#4928fd" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="278" cy="10" r="3.5" fill="#4928fd" />
    </svg>
  );
}

/** The gap between two visits — grey while you watched, iris while you were away. */
function TheGap() {
  return (
    <figure className="rounded-[24px] border border-line bg-surface px-4 py-8 shadow-card sm:px-8">
      <div className="relative mx-auto max-w-[640px]" aria-hidden>
        <svg viewBox="0 0 440 170" fill="none" className="h-auto w-full">
          <defs>
            <linearGradient id="gap-fill-2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4928fd" stopOpacity="0.14" />
              <stop offset="1" stopColor="#4928fd" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M160 110 L200 88 L240 98 L280 62 L320 76 L360 46 L400 56 L428 28 L428 170 L160 170 Z" fill="url(#gap-fill-2)" />
          <line x1="160" y1="10" x2="160" y2="160" stroke="rgba(27,29,30,0.12)" strokeDasharray="3 5" />
          <path d="M4 116 L44 106 L84 118 L124 98 L160 110" stroke="rgba(27,29,30,0.28)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M160 110 L200 88 L240 98 L280 62 L320 76 L360 46 L400 56 L428 28" stroke="#4928fd" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx="160" cy="110" r="4.5" fill="#ffffff" stroke="rgba(27,29,30,0.45)" strokeWidth="2" />
          <circle cx="428" cy="28" r="5.5" fill="#4928fd" />
        </svg>
        <span className="absolute left-[36%] top-[62%] inline-flex -translate-x-1/2 items-center rounded-full border border-line bg-white/90 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.07em] text-ink shadow-card backdrop-blur">
          You left — checkpoint saved
        </span>
        <span className="absolute right-[2%] top-[6%] inline-flex -translate-y-full items-center rounded-full bg-iris px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.07em] text-white shadow-float">
          You&rsquo;re back — the gap is the story
        </span>
      </div>
      <figcaption className="mt-4 text-center text-[13px] text-text-3">
        Since only ever narrates the iris part — the part you didn&rsquo;t see.
      </figcaption>
    </figure>
  );
}

/** Their short-form: the feed never ends. */
function TheirFeed() {
  return (
    <figure className="flex flex-col">
      <div className="relative flex-1 overflow-hidden rounded-[24px] border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between px-1 pb-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-text-3">Their short-form</span>
          <span className="font-mono text-[13px] text-text-3">∞</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-[14px] border border-line bg-canvas-2/60 p-3.5">
              <div className="h-2 w-2/3 rounded-full bg-ink/10" />
              <div className="mt-2 h-2 w-5/6 rounded-full bg-ink/[0.07]" />
              <div className="mt-2 h-2 w-1/2 rounded-full bg-ink/[0.07]" />
            </div>
          ))}
        </div>
        {/* the fade that never ends */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-surface to-transparent" aria-hidden />
      </div>
      <figcaption className="mt-3 px-2 text-center text-[13.5px] leading-snug text-text-2">
        Short, <em>so you stay.</em>
        <span className="block text-[12.5px] text-text-3">The scroll has no bottom. Leaving is a failure metric.</span>
      </figcaption>
    </figure>
  );
}

/** Our short-form: three cards, then a full stop. */
function OurFeed() {
  return (
    <figure className="flex flex-col">
      <div className="flex flex-1 flex-col rounded-[24px] border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between px-1 pb-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-text-3">Our short-form</span>
          <span className="font-mono text-[10.5px] text-text-3">48 SECONDS</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {["Reliance — buyback approved", "Eternal — Blinkit loss widened", "Groww — State Street took 23%"].map((t, i) => (
            <div key={t} className="flex items-center gap-3 rounded-[14px] border border-line bg-canvas-2/60 p-3.5">
              <span className={cx("size-2 shrink-0 rounded-full", i === 0 ? "bg-iris" : i === 1 ? "bg-fall-strong" : "bg-rise-strong")} aria-hidden />
              <span className="truncate text-[13px] text-text-2">{t}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto flex flex-col items-center gap-2 pb-2 pt-8">
          <span className="size-2.5 rounded-full bg-iris" aria-hidden />
          <p className="display text-[17px]">The feed ends.</p>
          <p className="text-[12.5px] text-text-3">Nothing else needs you today.</p>
        </div>
      </div>
      <figcaption className="mt-3 px-2 text-center text-[13.5px] leading-snug text-text-2">
        Short, <em>so you can leave.</em>
        <span className="block text-[12.5px] text-text-3">Success is the app closing with the question answered.</span>
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/* Content                                                                     */
/* -------------------------------------------------------------------------- */

const STATS: { figure: string; what: string; source: string; tint: string }[] = [
  { figure: "13.4 cr", what: "registered investors in India — nearly 5× the 2.75 crore of FY19.", source: "NSE Market Pulse · Jul 2026", tint: "bg-tile-sky" },
  { figure: "33", what: "median age of the Indian investor; 38% are under 30.", source: "NSE · Jun 2026", tint: "bg-tile-sage" },
  { figure: "91%", what: "of individual F&O traders lost money in FY25 — ₹1.06 lakh crore between them.", source: "SEBI · Jul 2025", tint: "bg-tile-blush" },
  { figure: "89%", what: "of India's Gen Z uses Reels daily. Short-form is the native format now.", source: "Meta / Ipsos · 2026", tint: "bg-tile-lavender" },
];

const DECISIONS: { chip: string; tint: string; thought: string; became: string }[] = [
  {
    chip: "Memory",
    tint: "bg-tile-lavender",
    thought: "The real question is: since when?",
    became: "A checkpoint saved on every visit, with the exact prices you saw — so \u201cfrom \u20b91,322\u201d always means the number that was on your screen.",
  },
  {
    chip: "Attention",
    tint: "bg-tile-gold",
    thought: "Attention is the scarce thing, not data.",
    became: "A verdict, then two or three ranked cards. Everything that didn't earn a card is filed under quiet — shown, never shouting.",
  },
  {
    chip: "Meaning",
    tint: "bg-tile-sky",
    thought: "A percentage isn't a meaning.",
    became: "Every move is split into the market's part and the stock's own, then judged against that stock's usual volatility. Loud is relative.",
  },
  {
    chip: "Trust",
    tint: "bg-tile-sage",
    thought: "Trust has to be checkable.",
    became: "Every \u201cwhy\u201d is written only from exchange filings and cited news. When nothing explains a move, the card says exactly that.",
  },
  {
    chip: "Voice",
    tint: "bg-tile-blush",
    thought: "Some catch-ups happen on a commute.",
    became: "The digest reads itself aloud — about forty-eight seconds, a calm voice over drawing charts, then it stops.",
  },
  {
    chip: "Platform",
    tint: "bg-tile-slate",
    thought: "This shouldn't only be our app.",
    became: "The digest is an API. Any broker can hand us a watchlist and render the same answer inside their own product.",
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal as="section" className="mt-14">
      <h2 className="label text-text-3">{title}</h2>
      <div className="mt-4 flex max-w-[68ch] flex-col gap-3 text-[16px] leading-relaxed text-text sm:text-[16.5px]">{children}</div>
    </Reveal>
  );
}
