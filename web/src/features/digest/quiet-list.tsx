import Link from "next/link";
import { CompanyLogo } from "@/components/brand/company-logo";
import { Sparkline } from "@/components/charts/sparkline";
import { Pill } from "@/components/ui/pill";
import type { QuietItem } from "@/lib/api/types";
import { pct, rupees } from "@/lib/format";

/** The stocks that did nothing unusual. One line each, calm by design — colour only in the mark and the number. */
export function QuietList({ items, since }: { items: QuietItem[]; since: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="quiet-heading">
      <div className="flex items-baseline justify-between px-1">
        <h2 id="quiet-heading" className="text-[15px] font-medium">
          Quiet <span className="text-text-3">· {items.length}</span>
        </h2>
        <p className="text-[13px] text-text-3">moved less than usual</p>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((q) => (
          <li key={q.symbol}>
            <Link
              href={`/stocks/${q.symbol}?since=${encodeURIComponent(since)}`}
              className="flex items-center gap-3.5 rounded-[20px] border border-line bg-surface px-4 py-3 transition-colors hover:border-line-2"
            >
              <CompanyLogo symbol={q.symbol} name={q.name} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{q.name}</span>
                {q.note ? (
                  <span className="mt-0.5 block truncate text-[12.5px] text-text-2" title={q.note.title}>
                    {q.note.title} <span className="text-text-3">· {q.note.source}</span>
                  </span>
                ) : (
                  <span className="block font-mono text-[11px] text-text-3">{q.symbol}</span>
                )}
              </span>
              <Sparkline values={q.sparkline} className="hidden sm:block" />
              <span className="text-right">
                <span className="block text-[14px] font-medium num">{rupees(q.priceNow)}</span>
                <Pill tone={q.changePct > 0 ? "rise" : q.changePct < 0 ? "fall" : "neutral"} size="sm" className="mt-1">
                  {pct(q.changePct)}
                </Pill>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
