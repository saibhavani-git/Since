"use client";

import Link from "next/link";
import { GapChart } from "@/components/charts/gap-chart";
import { IconArrowRight, IconPause } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { SourceList } from "@/features/digest/source-list";
import { Cited } from "@/features/digest/cited";
import { cx } from "@/lib/cx";
import { pct } from "@/lib/format";
import { demoCard, demoCardZomato } from "./demo-data";
import { PhoneCard } from "./phone/screens";
import { Reveal } from "./reveal";
import { Waveform } from "@/components/ui/waveform";

/**
 * Three flat colour tiles, one per thing Since does. Each holds a real
 * component from the product, spilling past the tile's edge the way a
 * screenshot sits in a magazine.
 */
export function ProductTiles() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
      <div className="grid gap-4 lg:grid-cols-3">
        <Tile tone="lavender" badge="Catch up" title="What changed, ranked." body="Open Since after a few days and get a verdict, then the two or three things worth a look. Everything else is filed under quiet." href="/sign-up" cta="Get started free" delay={0}>
          <div className="w-[340px] origin-top-left scale-[0.92]">
            <PhoneCard card={demoCard} animate={false} />
          </div>
        </Tile>

        <Tile tone="ink" badge="Listen" title="Sixty seconds, read aloud." body="Press play. A real voice reads what changed while each chart draws — a calm presenter, not a ticker." href="/sign-up" cta="Hear a sample" delay={0.08}>
          <div className="w-[340px] rounded-[24px] border border-ink-line bg-ink-raised p-4 text-text-on-ink">
            <p className="font-mono text-[11px] text-text-on-ink-3">ZOMATO · 4 / 5</p>
            <p className="display mt-2 text-[20px] leading-[1.1]">{demoCardZomato.headline}</p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="display text-[22px] text-fall-on-ink num">{pct(demoCardZomato.move.totalPct)}</span>
            </div>
            <GapChart series={demoCardZomato.series} sinceIndex={demoCardZomato.sinceIndex} height={72} onInk showLabels={false} className="mt-3" />
            <div className="mt-5 flex items-center justify-between">
              <Waveform bars={22} color="var(--color-iris-on-ink)" className="h-5" />
              <span className="flex size-9 items-center justify-center rounded-full bg-text-on-ink text-ink">
                <IconPause width={16} height={16} />
              </span>
            </div>
          </div>
        </Tile>

        <Tile tone="sage" badge="Why" title="Every claim has a source." body="The why is written from exchange filings and ticker-tagged news, and every number in it is one we computed. When nothing explains a move, we say so." href="/developers" cta="How it's grounded" delay={0.16}>
          <div className="w-[340px] rounded-[16px] border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-text-3">RELIANCE</span>
              <Pill tone="rise" size="sm">
                +3.3%
              </Pill>
            </div>
            <Cited text={demoCard.why!} sources={demoCard.sources} className="mt-3 text-[13px] leading-relaxed" />
            <div className="mt-4 border-t border-line pt-3">
              <SourceList sources={demoCard.sources} compact />
            </div>
          </div>
        </Tile>
      </div>
    </section>
  );
}

const tones = {
  lavender: { bg: "bg-tile-lavender", text: "text-ink", sub: "text-ink/70", badge: "bg-white/70 text-ink" },
  sage: { bg: "bg-tile-sage", text: "text-ink", sub: "text-ink/70", badge: "bg-white/70 text-ink" },
  ink: { bg: "bg-ink", text: "text-text-on-ink", sub: "text-text-on-ink-2", badge: "bg-white/15 text-text-on-ink" },
} as const;

function Tile({ tone, badge, title, body, href, cta, children, delay }: { tone: keyof typeof tones; badge: string; title: string; body: string; href: string; cta: string; children: React.ReactNode; delay: number }) {
  const t = tones[tone];
  return (
    <Reveal delay={delay} as="article" className={cx("relative flex min-h-[560px] flex-col overflow-hidden rounded-[24px] p-6 sm:p-7", t.bg, t.text)}>
      <div className="flex items-start justify-between">
        <h3 className="display text-[28px] leading-[1.05] sm:text-[30px]">{title}</h3>
        <span className={cx("ml-4 inline-flex h-[26px] shrink-0 items-center rounded-full px-2.5 text-[12px] font-medium", t.badge)}>{badge}</span>
      </div>
      <p className={cx("mt-3 max-w-[34ch] text-[15px] leading-relaxed", t.sub)}>{body}</p>
      <Link href={href} className={cx("mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium underline-offset-4 hover:underline", t.text)}>
        {cta} <IconArrowRight width={16} height={16} />
      </Link>
      <div className="pointer-events-none absolute -bottom-6 left-7 right-[-40px] top-[260px] sm:left-8">{children}</div>
    </Reveal>
  );
}
