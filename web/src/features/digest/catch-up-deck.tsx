"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CompanyLogo } from "@/components/brand/company-logo";
import { GapChart } from "@/components/charts/gap-chart";
import Image from "next/image";
import { IconArrowRight, IconExternal, IconNext, IconPrev } from "@/components/ui/icons";
import type { Digest, DigestCard } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { dateLabel, pct, rupees, whenLabel } from "@/lib/format";

const settle = [0.16, 1, 0.3, 1] as const;

/**
 * The Awake customer-stories composition: one dark_black card, one
 * pale-yellow card, one soft-gray strip, one white chart card — and the
 * "what changed" card rotates through the template's five service tints
 * (each accent at 20%).
 */
const newsTints = ["bg-tile-lavender", "bg-tile-slate", "bg-tile-sage", "bg-tile-pink", "bg-tile-apricot"] as const;

/**
 * The catch-up is a deck, not a dashboard. One stock gets the whole stage;
 * the small rail only changes which stock is active. This keeps the first
 * screen readable even when a watchlist has twenty names.
 */
export function CatchUpDeck({
  digest,
  actions,
  focusSymbol = null,
  onNavigate,
}: {
  digest: Digest;
  /** Rendered at the right end of the control row — the play button lives here. */
  actions?: React.ReactNode;
  /** While the catch-up narrates, the stock being read takes the stage. */
  focusSymbol?: string | null;
  /** Called with the chosen symbol when the user changes stocks by hand. */
  onNavigate?: (symbol: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const cards = digest.cards;
  const active = cards[Math.min(index, Math.max(0, cards.length - 1))];

  // Narration control: when the stock being read changes, its card takes the
  // stage. Synced during render (the React "adjust state on prop change"
  // pattern) so manual navigation still owns the index once playback stops.
  const [prevFocus, setPrevFocus] = useState(focusSymbol);
  if (focusSymbol !== prevFocus) {
    setPrevFocus(focusSymbol);
    const i = focusSymbol ? cards.findIndex((card) => card.symbol === focusSymbol) : -1;
    if (i >= 0) setIndex(i);
  }

  // Keep the active chip in view: previous stocks slide away as focus moves.
  useEffect(() => {
    const chip = railRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    chip?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", inline: "center", block: "nearest" });
  }, [index, reduce]);

  if (!active)
    return (
      <div>
        {actions ? <div className="mb-4 flex justify-end">{actions}</div> : null}
        <AllQuiet digest={digest} />
      </div>
    );

  const go = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), cards.length - 1);
    setIndex(clamped);
    onNavigate?.(cards[clamped]!.symbol);
  };

  return (
    <section aria-label="Stocks worth your attention">
      {cards.length > 1 || actions ? (
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {cards.length > 1 ? (
            <nav aria-label="Choose a stock" className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => go(index - 1)}
                disabled={index === 0}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line-2 bg-surface text-text transition-colors hover:border-text-3 disabled:opacity-30"
                aria-label="Previous stock"
              >
                <IconPrev width={18} height={18} />
              </button>

              <div ref={railRef} className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-max gap-1 rounded-full border border-line bg-surface p-1">
                  {cards.map((card, i) => (
                    <button
                      key={card.symbol}
                      type="button"
                      onClick={() => go(i)}
                      aria-current={i === index ? "true" : undefined}
                      className={cx(
                        "flex h-10 items-center gap-2.5 rounded-full px-3 pr-3.5 text-[13px] font-medium transition-colors",
                        i === index ? "bg-ink text-white" : "text-text-2 hover:bg-canvas-2 hover:text-text",
                      )}
                    >
                      <CompanyLogo symbol={card.symbol} name={card.instrument.name} size="sm" className="size-7 rounded-[8px] border-0" />
                      {card.symbol}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => go(index + 1)}
                disabled={index === cards.length - 1}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line-2 bg-surface text-text transition-colors hover:border-text-3 disabled:opacity-30"
                aria-label="Next stock"
              >
                <IconNext width={18} height={18} />
              </button>
            </nav>
          ) : (
            <span aria-hidden />
          )}
          {actions ? <div className="order-first shrink-0 lg:order-none">{actions}</div> : null}
        </div>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active.symbol}
          initial={reduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -18 }}
          transition={{ duration: 0.38, ease: settle }}
        >
          <FocusCard card={active} since={digest.since.at} />
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

/** Each story gets ten seconds on stage before the next one takes over. */
const STORY_MS = 10_000;
/** How often the active story's progress bar advances. */
const STORY_TICK_MS = 100;

/**
 * One stock's whole catch-up: the ink company card, the move chart, the four
 * stat tiles, the rotating stories, and the 30-second read. Exported so the
 * landing page can show the real thing on canned data.
 */
export function FocusCard({ card, since, href: hrefOverride }: { card: DigestCard; since: string; href?: string }) {
  /** Which story is on stage, and how far (0..1) its bar has filled. */
  const [stage, setStage] = useState({ story: 0, progress: 0 });
  const [paused, setPaused] = useState(false);
  const displayName = companyDisplayName(card.instrument.name);
  const dir = card.move.totalPct > 0 ? "rise" : card.move.totalPct < 0 ? "fall" : "flat";
  const closes = card.series.slice(card.sinceIndex).map((point) => point.c);
  const high = closes.length ? Math.max(...closes) : card.priceNow;
  const low = closes.length ? Math.min(...closes) : card.priceNow;
  const href = hrefOverride ?? `/stocks/${card.symbol}?since=${encodeURIComponent(since)}`;
  const news = card.story.filter((point) => point.kind !== "price").sort((a, b) => b.weight - a.weight);
  const selectedStory = news[Math.min(stage.story, Math.max(0, news.length - 1))];
  const newsTint = newsTints[hash(card.symbol) % newsTints.length]!;

  // Stories auto-play: the active bar fills over ten seconds, then the next
  // story takes the stage. Hovering the card pauses it; tapping a bar jumps.
  useEffect(() => {
    if (news.length < 2 || paused) return;
    const id = setInterval(() => {
      setStage((s) => {
        const progress = s.progress + STORY_TICK_MS / STORY_MS;
        return progress >= 1 ? { story: (s.story + 1) % news.length, progress: 0 } : { story: s.story, progress };
      });
    }, STORY_TICK_MS);
    return () => clearInterval(id);
  }, [news.length, paused]);

  return (
    <article className="grid gap-3 text-ink md:grid-cols-12 md:grid-rows-[420px_auto]" aria-label={`${displayName} catch-up card`}>
      {/* company — the dark_black story card */}
      <Link href={href} className="group/company min-h-[370px] rounded-[24px] bg-ink p-5 text-white transition-transform duration-300 hover:-translate-y-0.5 sm:p-7 md:col-span-4 md:min-h-0">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4">
            <CompanyLogo symbol={card.symbol} name={displayName} size="xl" className="border-white/15" />
            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-white/60">
              Open stock <IconArrowRight width={13} height={13} className="transition-transform group-hover/company:translate-x-0.5" />
            </span>
          </div>
          <div className="mt-4">
            <h2 className="display max-w-[12ch] text-[31px] leading-[0.98] text-balance text-white sm:text-[36px]">{displayName}</h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[12px] text-white/60">
              <span className="font-mono">{card.symbol}</span>
              <span>·</span>
              <span>{card.instrument.exchange}</span>
              {displayName !== card.instrument.name ? (
                <>
                  <span>·</span>
                  <span className="truncate">{card.instrument.name.replace(/\s*\([^)]+\)\s*$/, "")}</span>
                </>
              ) : null}
            </p>
          </div>

          <div className="mt-auto pt-7">
            <p className="label text-white/55 uppercase text-[11px] tracking-[0.06em]">Now</p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <p className="display text-[42px] text-white num sm:text-[48px]">{rupees(card.priceNow, { decimals: true })}</p>
              <span className={cx("mb-1 rounded-full px-2.5 py-1 text-[12.5px] font-semibold num", dir === "rise" ? "bg-rise-on-ink text-ink" : dir === "fall" ? "bg-fall-on-ink text-ink" : "bg-white text-ink")}>
                {pct(card.move.totalPct)}
              </span>
            </div>
            <p className="mt-3 text-[12px] text-white/60">Since {dateLabel(since)} · from {rupees(card.priceThen, { decimals: true })}</p>
          </div>
        </div>
      </Link>

      <section className="flex min-h-[360px] flex-col gap-3 transition-transform duration-300 hover:-translate-y-0.5 md:col-span-8 md:min-h-0">
        <div className="flex min-h-0 flex-1 flex-col rounded-[24px] border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SectionPill dark>The move</SectionPill>
                <p className="mt-1 text-[13px] text-ink/70">{dateLabel(since)} to now</p>
              </div>
              <span className={cx("rounded-full px-2.5 py-1 text-[12.5px] font-semibold num", dir === "rise" ? "bg-rise text-white" : dir === "fall" ? "bg-fall text-white" : "bg-ink text-white")}>{pct(card.move.totalPct)}</span>
            </div>
            <div className="mt-4 flex min-h-0 flex-1 flex-col">
              <div className="min-h-[100px] flex-1">
                <GapChart key={card.symbol} series={card.series} sinceIndex={card.sinceIndex} height={140} showLabels={false} fill />
              </div>
              <div className="mt-3 flex justify-between num">
                <span className="rounded-full bg-ink/5 px-3 py-1 text-[11.5px] font-semibold text-ink">{rupees(card.priceThen, { decimals: true })}</span>
                <span className="rounded-full bg-ink px-3 py-1 text-[11.5px] font-semibold text-white">{rupees(card.priceNow, { decimals: true })}</span>
              </div>
            </div>
        </div>
        {/* stats — the Awake service tiles: purple, pink, blue, green, each icon drawn for its number */}
        <dl className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile tint="bg-tile-lavender" icon={<HighSinceIcon />} label="High since" value={rupees(high, { decimals: true })} />
          <StatTile tint="bg-tile-blush" icon={<LowSinceIcon />} label="Low since" value={rupees(low, { decimals: true })} />
          <StatTile tint="bg-tile-slate" icon={<NiftyIcon />} label="Nifty 50" value={pct(card.move.indexPct)} />
          <StatTile tint="bg-tile-sage" icon={<Image src="/icons/awake/analitics.svg" alt="" width={40} height={40} unoptimized className="size-9 shrink-0 sm:size-10" aria-hidden />} label="Volume" value={card.volumeRatio == null ? "—" : `${card.volumeRatio.toFixed(1)}× usual`} />
        </dl>
      </section>

      {/* what changed — one of the five Awake service tints */}
      <section
        className={cx("min-h-[360px] rounded-[24px] p-5 transition-transform duration-300 hover:-translate-y-0.5 sm:p-7 md:col-span-7", newsTint)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3">
            <SectionPill>What changed</SectionPill>
            {news.length > 1 ? (
              <div className="flex w-[20%] min-w-[96px] gap-1" role="tablist" aria-label="Company stories">
                {news.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={i === stage.story}
                    aria-label={`Story ${i + 1} of ${news.length}`}
                    onClick={() => setStage({ story: i, progress: 0 })}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-black/10"
                  >
                    <span
                      className="block h-full rounded-full bg-ink transition-[width] duration-150 ease-linear"
                      style={{ width: i < stage.story ? "100%" : i === stage.story ? `${stage.progress * 100}%` : "0%" }}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {selectedStory ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selectedStory.id}
                className="flex flex-1 flex-col"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
              >
                <h3 className="display mt-6 max-w-[20ch] text-[27px] leading-[1.04] text-balance sm:text-[32px]">{selectedStory.title}</h3>
                {selectedStory.detail ? <p className="mt-3 line-clamp-3 max-w-[60ch] text-[14px] leading-relaxed text-ink/75">{selectedStory.detail}</p> : null}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-black/15 pt-3">
                  <p className="text-[12px] font-medium text-ink/65">{selectedStory.source} · {whenLabel(selectedStory.at)}</p>
                  {selectedStory.url ? (
                    <a href={selectedStory.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink underline decoration-ink/25 underline-offset-3 hover:decoration-ink">
                      Open source <IconExternal width={13} height={13} />
                    </a>
                  ) : null}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <>
              <p className="mt-5 text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink/60">Market signal</p>
              <h3 className="display mt-3 max-w-[20ch] text-[27px] leading-[1.04] text-balance sm:text-[32px]">{card.headline}</h3>
              <p className="mt-4 max-w-[42ch] text-[14px] leading-relaxed text-ink/75">No company-specific report was found. This is here because the market move itself crossed your alert threshold.</p>
            </>
          )}
        </div>
      </section>

      {/* 30-second read — the soft gray story card, dark_black at 5% (#1B1D1E0D) */}
      <section className="min-h-[360px] rounded-[24px] bg-ink/5 p-5 transition-transform duration-300 hover:-translate-y-0.5 sm:p-7 md:col-span-5">
        <div className="flex h-full flex-col">
          <SectionPill>30-second read</SectionPill>
          <blockquote className="mt-6 text-[17px] leading-[1.45] text-ink [overflow-wrap:anywhere] sm:text-[19px]">&ldquo;{card.summary}&rdquo;</blockquote>
          <Link href={href} className="mt-auto inline-flex w-fit items-center gap-1.5 pt-5 text-[13.5px] font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink">
            Read every source <IconArrowRight width={15} height={15} />
          </Link>
        </div>
      </section>
    </article>
  );
}

/** Uppercase section marker: a proper pill — ink-filled when dark, soft white otherwise. */
function SectionPill({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={cx("inline-flex h-7 w-fit items-center rounded-full px-3 text-[10.5px] font-bold uppercase tracking-[0.07em]", dark ? "bg-ink text-white" : "border border-black/10 bg-white/70 text-ink")}>
      {children}
    </span>
  );
}

/**
 * One Awake service tile — icon on the left in the accent colour, the label
 * with its figure stacked beside it. Same block, same language as the
 * template's Brand Strategy / Web Development tiles.
 */
function StatTile({ tint, icon, label, value }: { tint: string; icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={cx("flex flex-col gap-4 rounded-[20px] p-5", tint)}>
      <span aria-hidden className="shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink/60">{label}</dt>
        <dd className="mt-1 text-[17px] font-semibold leading-tight tracking-[-0.01em] text-ink num">{value}</dd>
      </div>
    </div>
  );
}

/*
 * Stat icons drawn in the Awake set's own voice: 40-grid, hairline ~1.8
 * weight, rounded caps, the accent colour baked in — same as brand.svg and
 * analitics.svg, but each one speaks its number.
 */
function HighSinceIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="size-9 sm:size-10" aria-hidden>
      <path d="M5 27.5 L13.8 18.2 L19.8 23.4 L33 9.5" stroke="#BA81EE" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24.8 9 H33.6 V17.8" stroke="#BA81EE" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 34.5 H35" stroke="#BA81EE" strokeWidth="2.3" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function LowSinceIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="size-9 sm:size-10" aria-hidden>
      <path d="M5 11 L13.8 20.3 L19.8 15.1 L33 29" stroke="#F4889A" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24.8 29.5 H33.6 V20.7" stroke="#F4889A" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 34.5 H35" stroke="#F4889A" strokeWidth="2.3" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function NiftyIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="size-9 sm:size-10" aria-hidden>
      <path d="M6.5 6 V30 a3.5 3.5 0 0 0 3.5 3.5 H34" stroke="#70B5FF" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 26 L18.5 18.8 L23.5 22.4 L30.5 12.5" stroke="#70B5FF" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30.5" cy="12.5" r="2.7" fill="#70B5FF" />
    </svg>
  );
}


function hash(value: string): number {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return result;
}

/** Prefer the name investors use: "Paytm", not "One 97 Communications (Paytm)". */
export function companyDisplayName(name: string): string {
  const alias = /\(([^)]+)\)\s*$/.exec(name)?.[1]?.trim();
  return alias && alias.length <= 24 ? alias : name.replace(/\s+(limited|ltd\.?)$/i, "").trim();
}

function AllQuiet({ digest }: { digest: Digest }) {
  return (
    <section className="grid gap-3 text-ink md:grid-cols-12" aria-label="Quiet watchlist">
      <div className="rounded-[24px] bg-tile-mint px-6 py-10 sm:px-9 sm:py-12 md:col-span-7">
        <div className="flex w-fit -space-x-2">
          {digest.quiet.slice(0, 6).map((item) => (
            <CompanyLogo key={item.symbol} symbol={item.symbol} name={item.name} size="md" className="ring-2 ring-tile-mint" />
          ))}
        </div>
        <p className="label mt-8 text-ink/65">All clear · {digest.gap.sessions} {digest.gap.sessions === 1 ? "session" : "sessions"} checked</p>
        <h2 className="display mt-4 max-w-[13ch] text-[38px] leading-[1.02] text-balance sm:text-[52px]">
          {digest.quiet.length === 1 ? `A quiet window for ${digest.quiet[0]?.name}.` : `A quiet window across all ${digest.quiet.length}.`}
        </h2>
        <p className="mt-5 max-w-[55ch] text-[15px] leading-relaxed text-ink/75">
          We checked company news, exchange filings, price and volume. No company-specific update or unusual market move showed up in this window.
        </p>
      </div>

      <div className="rounded-[24px] bg-tile-violet p-4 sm:p-5 md:col-span-5">
        <p className="label px-2 pb-3 pt-1 text-ink/65">Where they stand</p>
        <ul className="divide-y divide-black/10">
          {digest.quiet.map((item) => (
            <li key={item.symbol}>
              <Link href={`/stocks/${item.symbol}?since=${encodeURIComponent(digest.since.at)}`} className="flex items-center gap-3 rounded-[16px] px-2 py-3 transition-colors hover:bg-white/35">
                <CompanyLogo symbol={item.symbol} name={item.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{item.name}</span>
                  <span className="font-mono text-[10.5px] text-ink/60">{item.symbol}</span>
                </span>
                <span className="text-right">
                  <span className="block text-[13px] font-semibold num">{rupees(item.priceNow, { decimals: true })}</span>
                  <span className={cx("mt-0.5 block text-[11.5px] font-medium num", item.changePct > 0 ? "text-rise-strong" : item.changePct < 0 ? "text-fall-strong" : "text-ink/60")}>{pct(item.changePct)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

