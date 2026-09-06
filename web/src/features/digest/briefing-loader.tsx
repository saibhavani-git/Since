"use client";

import { motion, useReducedMotion } from "motion/react";
import { CompanyLogo } from "@/components/brand/company-logo";
import type { WatchlistItem } from "@/lib/api/types";

const stages = ["Comparing every market session", "Reading the important news", "Writing one clear brief"];

/** Real loading state for a new look-back window. No fake percentage. */
export function DigestPreparing({ period, items }: { period: string; items: WatchlistItem[] }) {
  const reduce = useReducedMotion();
  return (
    <section aria-live="polite" aria-busy className="relative grid gap-3 overflow-hidden rounded-[30px] bg-surface p-3 text-ink md:grid-cols-12">
      <div className="relative min-h-[350px] overflow-hidden rounded-[24px] bg-tile-apricot p-6 md:col-span-5 md:row-span-2 md:min-h-[500px]">
        <div className="relative z-20 flex h-full flex-col">
          <p className="label text-ink/50">Opening your watchlist</p>
          <div className="mt-6 flex w-fit -space-x-2">
            {items.slice(0, 6).map((item) => (
              <CompanyLogo key={item.symbol} symbol={item.symbol} name={item.instrument.name} size="md" className="ring-2 ring-tile-apricot" />
            ))}
          </div>
          <h2 className="display mt-7 max-w-[10ch] text-[38px] leading-[0.98] sm:text-[52px]">Building your catch-up.</h2>
          <p className="mt-4 text-[14px] text-ink/60">{period} · {items.length} {items.length === 1 ? "stock" : "stocks"}</p>
          <p className="mt-auto max-w-[30ch] pt-10 text-[13.5px] leading-relaxed text-ink/65">
            A full month can take a few seconds. We&apos;ll replace this board when every story is ready.
          </p>
        </div>
      </div>

      <div className="relative min-h-[235px] overflow-hidden rounded-[24px] bg-tile-pink p-6 md:col-span-7">
        <div className="relative z-20 flex items-center justify-between">
          <div>
            <p className="label text-ink/50">Comparing every session</p>
            <p className="mt-2 text-[13px] text-ink/60">Price, high, low and volume</p>
          </div>
          <PulseDot delay={0} />
        </div>
        <LoadingChart />
      </div>

      <div className="relative min-h-[250px] overflow-hidden rounded-[24px] bg-tile-gold p-6 md:col-span-7">
        <div className="relative z-20">
          <div className="flex items-center justify-between">
            <div>
              <p className="label text-ink/50">Reading what changed</p>
              <p className="mt-2 text-[13px] text-ink/60">News, filings and company events</p>
            </div>
            <PulseDot delay={0.25} />
          </div>
          <div className="mt-7 space-y-3">
            {[86, 72, 54].map((width, index) => (
              <motion.div
                key={width}
                className="h-3 rounded-full bg-ink/15"
                style={{ width: `${width}%` }}
                animate={reduce ? undefined : { opacity: [0.25, 0.7, 0.25], x: [0, index * 5, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.18, ease: "easeInOut" }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative min-h-[220px] overflow-hidden rounded-[24px] bg-tile-violet p-6 sm:p-8 md:col-span-12">
        <div className="relative z-20 grid gap-7 md:grid-cols-[0.4fr_0.6fr] md:items-end">
          <div>
            <p className="label text-ink/50">Writing the brief</p>
            <h3 className="display mt-4 max-w-[12ch] text-[30px] leading-none sm:text-[38px]">Only the useful part survives.</h3>
          </div>
          <StageList onInk={false} />
        </div>
      </div>
    </section>
  );
}

/** The first narrated clip is generated after the user presses Play. */
export function VoicePreparing() {
  return (
    <div className="mx-auto max-w-[620px] px-5 text-center" aria-live="polite" aria-busy>
      <VoiceMark />
      <p className="label mt-8 text-text-on-ink-3">Your narrated catch-up</p>
      <h2 className="display mt-4 text-[40px] leading-none text-text-on-ink sm:text-[60px]">Getting the voice ready.</h2>
      <p className="mx-auto mt-5 max-w-[44ch] text-[15px] leading-relaxed text-text-on-ink-2">
        Preparing the first story. It usually takes only a few seconds.
      </p>
      <StageList onInk />
    </div>
  );
}

function StageList({ onInk }: { onInk: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className={`mx-auto mt-9 max-w-[430px] divide-y rounded-[24px] border text-left ${onInk ? "divide-white/10 border-white/10 bg-white/[0.04]" : "divide-black/10 border-black/10 bg-white/25"}`}>
      {stages.map((stage, index) => (
        <div key={stage} className={`flex items-center gap-3 px-4 py-3 text-[13px] ${onInk ? "text-text-on-ink-2" : "text-ink/65"}`}>
          <motion.span
            className={`size-2 shrink-0 rounded-full ${onInk ? "bg-iris-on-ink" : "bg-iris"}`}
            animate={reduce ? undefined : { opacity: [0.25, 1, 0.25], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.28, ease: "easeInOut" }}
          />
          {stage}
        </div>
      ))}
    </div>
  );
}

function VoiceMark() {
  const reduce = useReducedMotion();
  const heights = [14, 28, 20, 38, 24, 31, 16];
  return (
    <div className="mx-auto flex h-16 w-fit items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-6">
      {heights.map((height, index) => (
        <motion.span
          key={height}
          className="w-1 rounded-full bg-iris-on-ink"
          style={{ height }}
          animate={reduce ? undefined : { scaleY: [0.45, 1, 0.45] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.09, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function LoadingChart() {
  const reduce = useReducedMotion();
  return (
    <svg className="absolute inset-x-5 bottom-5 h-[118px] w-[calc(100%-2.5rem)] overflow-visible" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden>
      <path d="M 0 84 C 70 76, 85 92, 145 73 S 240 52, 300 67 S 390 35, 445 45 S 530 24, 600 31" fill="none" stroke="rgba(25,26,23,.18)" strokeWidth="2" strokeLinecap="round" />
      <motion.path
        d="M 0 84 C 70 76, 85 92, 145 73 S 240 52, 300 67 S 390 35, 445 45 S 530 24, 600 31"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.45, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  );
}

function PulseDot({ delay }: { delay: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="size-2.5 rounded-full bg-ink"
      animate={reduce ? undefined : { opacity: [0.2, 1, 0.2], scale: [0.75, 1, 0.75] }}
      transition={{ duration: 1.4, repeat: Infinity, delay, ease: "easeInOut" }}
      aria-hidden
    />
  );
}


