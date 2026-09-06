import type { DigestCard } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { pct, rupees } from "@/lib/format";

type Tone = "rise" | "fall" | "neutral" | "iris";

interface Fact {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
}

/**
 * The numbers a person would otherwise have to go and look up. Derived only
 * from what the card already carries, so the strip never disagrees with the
 * chart or the prose: the range the stock covered while you were away, how
 * unusual the move was for this stock, volume, and what the market did.
 */
export function factsOf(card: DigestCard): Fact[] {
  const gap = card.series.slice(card.sinceIndex);
  const closes = gap.map((p) => p.c);
  const hi = closes.length ? Math.max(...closes) : card.priceNow;
  const lo = closes.length ? Math.min(...closes) : card.priceNow;
  const sig = Math.abs(card.volatility.moveInSigmas);
  const vs = card.move.indexPct;

  const facts: Fact[] = [
    { label: "High since", value: rupees(hi), sub: hi === card.priceNow ? "that’s now" : pct(((hi - card.priceNow) / card.priceNow) * 100) + " above now", tone: "rise" },
    { label: "Low since", value: rupees(lo), sub: lo === card.priceNow ? "that’s now" : pct(((lo - card.priceNow) / card.priceNow) * 100) + " below now", tone: "fall" },
    {
      label: "Own move",
      value: `${sig.toFixed(1)}×`,
      sub: sig < 0.5 ? "mostly just the market" : sig < 1.5 ? "within its normal range" : sig < 2.5 ? "big, for this stock" : "rare, for this stock",
      tone: sig >= 1.5 ? "iris" : "neutral",
    },
  ];
  if (card.volumeRatio != null) {
    facts.push({ label: "Volume", value: `${card.volumeRatio.toFixed(1)}×`, sub: card.volumeRatio >= 1.5 ? "busier than usual" : card.volumeRatio <= 0.7 ? "quieter than usual" : "about usual", tone: card.volumeRatio >= 1.5 ? "iris" : "neutral" });
  } else {
    facts.push({ label: "Nifty 50", value: pct(vs), sub: "over the same days", tone: vs > 0.05 ? "rise" : vs < -0.05 ? "fall" : "neutral" });
  }
  return facts;
}

const valueTone: Record<Tone, string> = { rise: "text-rise-strong", fall: "text-fall-strong", neutral: "text-text", iris: "text-iris-strong" };

export function CardFacts({ card, size = "md", className }: { card: DigestCard; size?: "sm" | "md"; className?: string }) {
  const facts = factsOf(card);
  const sm = size === "sm";
  return (
    <dl className={cx("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
      {facts.map((f) => (
        <div key={f.label} className={cx("rounded-[16px] bg-canvas", sm ? "px-3 py-2.5" : "px-3.5 py-3")}>
          <dt className={cx("font-medium text-text-3", sm ? "text-[11px]" : "text-[12px]")}>{f.label}</dt>
          <dd className={cx("num mt-0.5 font-semibold tracking-[-0.01em]", sm ? "text-[16px]" : "text-[18px]", valueTone[f.tone ?? "neutral"])}>{f.value}</dd>
          {f.sub ? <dd className={cx("text-text-3", sm ? "text-[10.5px]" : "text-[11px]")}>{f.sub}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

/** Everything else the engine noticed, after the headline has taken the loudest one. */
export function AlsoNoticed({ card, className }: { card: DigestCard; className?: string }) {
  const rest = card.signals.slice(1);
  if (rest.length === 0) return null;
  return (
    <ul className={cx("space-y-1.5", className)}>
      {rest.map((s) => (
        <li key={s.kind + (s.at ?? "")} className="flex items-start gap-2.5 text-[14px] leading-snug text-text-2">
          <span aria-hidden className={cx("mt-[7px] size-1.5 shrink-0 rounded-full", s.tier === 1 ? "bg-iris" : "bg-text-3")} />
          <span>{s.summary}</span>
        </li>
      ))}
    </ul>
  );
}
