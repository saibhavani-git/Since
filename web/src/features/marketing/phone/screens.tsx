"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Wordmark } from "@/components/brand/wordmark";
import { GapChart } from "@/components/charts/gap-chart";
import { MoveBar } from "@/components/charts/move-bar";
import { Sparkline } from "@/components/charts/sparkline";
import { IconCheck, IconPlay, IconPlus, IconSearch } from "@/components/ui/icons";
import { Pill, type Tone } from "@/components/ui/pill";
import type { DigestCard, Instrument, QuietItem } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { pct, rupees } from "@/lib/format";
import { CountUp } from "../count-up";
import { thesisOptions, type ThesisKind } from "@/features/watchlist/thesis";
import { Typewriter, Words } from "../reel/typewriter";
import { Waveform } from "@/components/ui/waveform";

const ease = [0.16, 1, 0.3, 1] as const;
const chipTone: Record<DigestCard["chips"][number]["tone"], Tone> = { neutral: "outline", rise: "rise", fall: "fall", market: "outline", iris: "iris", stale: "stale" };

/* ---------- chrome ---------- */

export function StatusBar() {
  return (
    <div className="flex h-12 items-end justify-between px-7 pb-1 font-mono text-[12px] text-text">
      <span>9:41</span>
      <span className="flex items-center gap-1.5" aria-hidden>
        <span className="h-2 w-3 rounded-[2px] bg-ink" />
        <span className="h-2 w-5 rounded-[3px] border border-ink" />
      </span>
    </div>
  );
}

export function AppBar({ onAdd, addPulse = false }: { onAdd?: () => void; addPulse?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 pb-2 pt-1">
      <Wordmark href={null} size="sm" />
      <motion.button
        type="button"
        onClick={onAdd}
        aria-label="Add a stock"
        className="flex size-9 items-center justify-center rounded-full bg-ink text-white"
        animate={addPulse ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={addPulse ? { duration: 1.8, repeat: Infinity } : {}}
      >
        <IconPlus width={18} height={18} />
      </motion.button>
    </div>
  );
}

/* ---------- header ---------- */

export function Header({ label, headline, sub, animate = true }: { label: string; headline: string; sub: string; animate?: boolean }) {
  return (
    <div className="px-5 pt-3">
      <p className="label text-text-3">{animate ? <Typewriter text={label} /> : label}</p>
      <h3 className="display mt-2 text-[28px] leading-[1.02]">{animate ? <Words text={headline} delay={0.4} /> : headline}</h3>
      <motion.p initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.5 }} className="mt-2 text-[13px] leading-snug text-text-2">
        {sub}
      </motion.p>
    </div>
  );
}

/* ---------- card ---------- */

export function PhoneCard({ card, triggered = false, animate = true }: { card: DigestCard; triggered?: boolean; animate?: boolean }) {
  const dir = card.move.totalPct >= 0 ? "rise" : "fall";
  const d = (n: number) => (animate ? n : 0);
  return (
    <article className={cx("rounded-[24px] border bg-surface p-4", triggered ? "border-iris/50" : "border-line")}>
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Pill tone="outline" mono size="sm">
            {card.symbol}
          </Pill>
          {triggered ? (
            <Pill tone="iris" dot size="sm">
              Your condition
            </Pill>
          ) : (
            <span className="truncate text-[11px] text-text-3">{card.instrument.name}</span>
          )}
        </div>
        <Pill tone={dir} className="shrink-0 font-semibold">
          {animate ? <CountUp to={card.move.totalPct} format={(n) => pct(n)} duration={1.2} delay={0.9} /> : pct(card.move.totalPct)}
        </Pill>
      </header>

      <h4 className="display mt-3 text-[20px]">{animate ? <Words text={card.headline} delay={0.15} stagger={0.03} /> : card.headline}</h4>

      <GapChart series={card.series} sinceIndex={card.sinceIndex} height={84} showLabels={false} className="mt-4" />
      <div className="mt-1.5 flex items-center justify-between text-[11px] num">
        <span className="flex items-center gap-1.5 text-text-3">
          <span className="size-1.5 rounded-full bg-iris" /> you · {rupees(card.priceThen)}
        </span>
        <span className="font-medium text-text-2">now · {rupees(card.priceNow)}</span>
      </div>

      <div className="my-3.5 h-px bg-line" />
      <MoveBar {...card.move} size="sm" animate={animate} delay={1.8} />
      <div className="my-3.5 h-px bg-line" />

      <p className="text-[11px] font-medium text-text-2">Why</p>
      <motion.p initial={animate ? { opacity: 0, y: 6 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: d(2.6), duration: 0.5 }} className="mt-1 text-[12.5px] leading-relaxed text-text">
        {card.why ? (
          card.why.split(/(\[\d+\])/g).map((part, i) => {
            const m = /^\[(\d+)\]$/.exec(part);
            return m ? (
              <span key={i} className="mx-0.5 inline-flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-iris-tint px-1 align-top font-mono text-[9px] text-iris-strong">
                {m[1]}
              </span>
            ) : (
              <span key={i}>{part}</span>
            );
          })
        ) : (
          <span className="text-text-3">Nothing on record clearly explains this.</span>
        )}
      </motion.p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {card.chips.map((c, i) => (
          <motion.li key={c.label} initial={animate ? { opacity: 0, y: 6 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: d(3.1 + i * 0.1) }}>
            <Pill tone={chipTone[c.tone]} size="sm">
              {c.label}
            </Pill>
          </motion.li>
        ))}
      </ul>
    </article>
  );
}

/* ---------- quiet + footer ---------- */

export function Quiet({ items, animate = true }: { items: QuietItem[]; animate?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between px-1">
        <p className="label text-text-3">Quiet · {items.length}</p>
        <p className="text-[11px] text-text-3">moved less than usual</p>
      </div>
      <ul className="mt-2 divide-y divide-line rounded-[16px] border border-line bg-surface">
        {items.map((q, i) => (
          <motion.li key={q.symbol} initial={animate ? { opacity: 0, x: -8 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.1, duration: 0.4, ease }} className="flex items-center gap-3 px-3.5 py-2.5">
            <span className="w-[76px] font-mono text-[11px] text-text-2">{q.symbol}</span>
            <Sparkline values={q.sparkline} width={56} height={18} />
            <span className="flex-1 text-right text-[12px] num text-text-2">{rupees(q.priceNow)}</span>
            <span className={cx("w-11 text-right text-[11px] num", q.changePct >= 0 ? "text-rise-strong" : "text-fall-strong")}>{pct(q.changePct)}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function CaughtUpBar({ pulse = false, onPlay }: { pulse?: boolean; onPlay?: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-[16px] border border-line bg-surface px-3.5 py-2.5">
      <div>
        <p className="text-[13px] font-medium">Done reading?</p>
        <p className="text-[11px] text-text-3">Or press play and listen.</p>
      </div>
      <div className="flex items-center gap-2">
        <motion.button type="button" onClick={onPlay} aria-label="Play" className="flex size-8 items-center justify-center rounded-full bg-ink text-white" animate={pulse ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 1.6, repeat: Infinity }}>
          <IconPlay width={14} height={14} />
        </motion.button>
        <span className="inline-flex h-8 items-center gap-1 rounded-full bg-iris px-3 text-[12px] font-medium text-white">
          <IconCheck width={13} height={13} /> Caught up
        </span>
      </div>
    </div>
  );
}

/* ---------- voice overlay ---------- */

export function VoiceOverlay({ show, card }: { show: boolean; card: DigestCard }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div key="voice" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.55, ease }} className="absolute inset-x-0 bottom-0 top-12 z-10 flex flex-col justify-between rounded-t-[28px] bg-ink px-5 pb-6 pt-5 text-text-on-ink">
          <div className="flex gap-1">
            {[1, 1, 0.5, 0, 0].map((p, i) => (
              <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                <motion.span className="block h-full rounded-full bg-text-on-ink" initial={{ width: i === 2 ? "0%" : `${p * 100}%` }} animate={{ width: `${p * 100}%` }} transition={i === 2 ? { duration: 3, ease: "linear", delay: 0.4 } : { duration: 0 }} />
              </span>
            ))}
          </div>
          <div>
            <p className="font-mono text-[11px] text-text-on-ink-3">{card.symbol} · 3 / 5</p>
            <p className="display mt-2 text-[24px] leading-[1.08]">
              <Words text={card.headline} delay={0.5} stagger={0.05} />
            </p>
            <GapChart series={card.series} sinceIndex={card.sinceIndex} height={80} onInk showLabels={false} className="mt-6" />
          </div>
          <div className="flex items-center justify-between">
            <Waveform bars={22} color="var(--color-iris-on-ink)" className="h-6" />
            <span className="rounded-full border border-ink-line px-3 py-1 text-[11px] text-text-on-ink-2">Now playing</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ---------- add sheet (interactive) ---------- */

export type AddStep = { kind: "search"; q: string } | { kind: "reason"; instrument: Instrument; thesis: ThesisKind };

export function AddSheet({
  step,
  results,
  onQuery,
  onPick,
  onThesis,
  onAdd,
  onClose,
}: {
  step: AddStep;
  results: Instrument[];
  onQuery: (q: string) => void;
  onPick: (i: Instrument) => void;
  onThesis: (k: ThesisKind) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key="sheet"
      initial={reduce ? false : { y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.45, ease }}
      className="absolute inset-x-0 bottom-0 z-10 flex h-[82%] flex-col rounded-t-[24px] border-t border-line bg-surface"
    >
      <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-line-2" />
      {step.kind === "search" ? (
        <>
          <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
            <IconSearch width={18} height={18} className="shrink-0 text-text-3" />
            <input
              autoFocus
              value={step.q}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search a stock — try “tata”"
              className="h-7 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-text-3"
              aria-label="Search stocks"
            />
            <button type="button" onClick={onClose} className="text-[13px] text-text-2">
              Cancel
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {step.q.trim() === "" ? (
              <li className="px-3 py-8 text-center text-[13px] text-text-3">Type a name or symbol.</li>
            ) : results.length === 0 ? (
              <li className="px-3 py-8 text-center text-[13px] text-text-3">Nothing matched “{step.q}” in the demo. Try Reliance, Tata, SBI, Zomato.</li>
            ) : (
              results.map((r) => (
                <li key={r.symbol}>
                  <button type="button" onClick={() => onPick(r)} className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left hover:bg-canvas">
                    <span className="w-[88px] font-mono text-[11px] text-text-2">{r.symbol}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px]">{r.name}</span>
                    <span className="text-[11px] text-text-3">{r.sector}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      ) : (
        <div className="flex flex-1 flex-col p-5">
          <p className="font-mono text-[11px] text-text-3">{step.instrument.symbol}</p>
          <h4 className="display mt-1 text-[22px]">{step.instrument.name}</h4>
          <p className="mt-5 text-[14px] font-medium">Why are you watching this?</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {thesisOptions.map((o) => {
              const active = o.kind === step.thesis;
              return (
                <button
                  key={o.kind}
                  type="button"
                  onClick={() => onThesis(o.kind)}
                  className={cx("rounded-[14px] border px-3 py-2.5 text-left transition-colors", active ? "border-ink bg-ink text-white" : "border-line-2 bg-surface")}
                >
                  <p className="text-[13px] font-medium">{o.label}</p>
                  <p className={cx("mt-0.5 text-[11px] leading-snug", active ? "text-white/70" : "text-text-3")}>{o.hint}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-auto flex gap-2 pt-5">
            <button type="button" onClick={onClose} className="h-11 flex-1 rounded-[14px] border border-line-2 text-[14px] font-medium text-text-2">
              Cancel
            </button>
            <button type="button" onClick={onAdd} className="h-11 flex-[1.4] rounded-[14px] bg-ink text-[14px] font-medium text-white">
              Add to watchlist
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
