"use client";

import Link from "next/link";
import { useState } from "react";
import { PriceChart } from "@/components/charts/price-chart";
import { CompanyLogo } from "@/components/brand/company-logo";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { IconArrowLeft, IconCheck, IconPlus } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useCandles, useStock } from "@/features/market/use-market";
import { useAddStock } from "@/features/watchlist/add-stock-provider";
import { usePrimaryWatchlist } from "@/features/watchlist/use-watchlists";
import { ApiError } from "@/lib/api/client";
import type { CandleRange, Quote } from "@/lib/api/types";
import { compact, dateLabel, pct, rupees } from "@/lib/format";
import { StockNews } from "./stock-news";

const ranges: { value: CandleRange; label: string }[] = [
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
];

/**
 * One stock, one card: the price now, the chart, and the numbers that frame
 * it. The story of what changed lives on the catch-up — this page is simply
 * the latest market information, presented calmly.
 */
export function StockView({ symbol }: { symbol: string }) {
  const stock = useStock(symbol);
  const [range, setRange] = useState<CandleRange>("3M");
  const candles = useCandles(symbol, range);
  const { watchlist } = usePrimaryWatchlist();
  const { open } = useAddStock();

  const item = watchlist?.items.find((i) => i.symbol === symbol);

  if (stock.isPending) return <StockSkeleton />;
  if (stock.isError) {
    return (
      <Empty
        title={stock.error instanceof ApiError && stock.error.status === 404 ? `We don't know ${symbol}.` : "Couldn't load this stock."}
        body={stock.error instanceof ApiError && stock.error.status === 404 ? "Check the symbol, or search for the company name." : stock.error.message}
        action={
          <Button variant="secondary" onClick={() => open({ symbol })}>
            Search instead
          </Button>
        }
      />
    );
  }

  const { instrument, quote, events, bseQuote } = stock.data;
  const points = candles.data?.candles.map((c) => ({ t: c.t, c: c.c })) ?? [];

  return (
    <div className="flex flex-col gap-10">
      <Link
        href="/catch-up"
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-medium text-text-2 shadow-card transition-colors hover:text-text"
      >
        <IconArrowLeft width={15} height={15} /> Catch up
      </Link>

      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <CompanyLogo symbol={instrument.symbol} name={instrument.name} size="lg" className="mt-1" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill tone="outline" mono>
                {instrument.symbol}
              </Pill>
              <Pill tone="neutral">{instrument.exchange}</Pill>
              {instrument.sector ? <Pill tone="neutral">{instrument.sector}</Pill> : null}
            </div>
            <h1 className="display mt-3 text-[36px] sm:text-[48px]">{instrument.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 num">
              <span className="display text-[32px]">{rupees(quote.price, { decimals: true })}</span>
              <Pill tone={quote.changePct > 0 ? "rise" : quote.changePct < 0 ? "fall" : "neutral"} className="text-[13px] font-semibold">
                {quote.change > 0 ? "+" : ""}
                {quote.change.toFixed(2)} · {pct(quote.changePct, 2)} today
              </Pill>
            </div>
            {bseQuote ? (
              <p className="mt-1.5 text-[13px] text-text-3 num">
                BSE {rupees(bseQuote.price, { decimals: true })} · {pct(bseQuote.changePct, 2)}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {item ? (
            <Link href="/watchlist" className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-5 text-[14px] font-medium text-text-2 transition-colors hover:text-text">
              <IconCheck width={16} height={16} className="text-rise-strong" /> In watchlist
            </Link>
          ) : (
            <Button size="lg" onClick={() => open({ symbol })}>
              <IconPlus width={16} height={16} /> Add to watchlist
            </Button>
          )}
        </div>
      </header>

      <section className="rounded-[28px] border border-line bg-surface p-5 shadow-card sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-canvas px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-text-2">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rise opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-rise" />
            </span>
            Close · NSE
          </span>
          <Segmented ariaLabel="Chart range" size="sm" value={range} onChange={setRange} options={ranges} />
        </div>
        {points.length > 1 ? <PriceChart points={points} height={240} /> : <Skeleton className="h-[240px]" />}
        <Stats quote={quote} events={events} />
      </section>

      <StockNews symbol={symbol} />
    </div>
  );
}

function Stats({ quote, events }: { quote: Quote; events: { nextResultsAt: string | null; lastResultsAt: string | null; exDividendAt: string | null } }) {
  const range52 = quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekLow ? ((quote.price - quote.fiftyTwoWeekLow) / (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) * 100 : null;
  const cells: { label: string; value: string }[] = [
    { label: "Open", value: quote.open ? rupees(quote.open, { decimals: true }) : "—" },
    { label: "Day range", value: quote.dayLow && quote.dayHigh ? `${rupees(quote.dayLow)} – ${rupees(quote.dayHigh)}` : "—" },
    { label: "Prev close", value: rupees(quote.previousClose, { decimals: true }) },
    { label: "Volume", value: quote.volume ? compact(quote.volume) : "—" },
    { label: "Avg volume", value: quote.averageVolume ? compact(quote.averageVolume) : "—" },
    { label: "Next results", value: events.nextResultsAt ? dateLabel(events.nextResultsAt) : "—" },
  ];
  return (
    <div className="mt-6 border-t border-line pt-5">
      {range52 !== null ? (
        <div className="mb-5 rounded-[20px] bg-canvas px-4 py-3.5">
          <div className="flex justify-between text-[12px] font-medium text-text-2 num">
            <span>52w low · {rupees(quote.fiftyTwoWeekLow!)}</span>
            <span>52w high · {rupees(quote.fiftyTwoWeekHigh!)}</span>
          </div>
          <div className="relative mt-3 h-2 rounded-full bg-canvas-2">
            <span className="absolute inset-y-0 left-0 rounded-full bg-iris/30" style={{ width: `${Math.min(100, Math.max(0, range52))}%` }} />
            <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-iris" style={{ left: `${Math.min(100, Math.max(0, range52))}%` }} />
          </div>
        </div>
      ) : null}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {cells.map((c) => (
          <div key={c.label} className="rounded-[20px] bg-canvas px-4 py-3.5">
            <dt className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-text-3">{c.label}</dt>
            <dd className="mt-1.5 text-[15px] font-medium num">{c.value}</dd>
          </div>
        ))}
      </dl>
      {quote.freshness.stale ? (
        <Pill tone="stale" dot className="mt-4">
          stale quote
        </Pill>
      ) : null}
    </div>
  );
}

function StockSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-busy>
      <Skeleton className="h-3 w-20" />
      <div>
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-3 h-12 w-[50%]" />
        <Skeleton className="mt-4 h-9 w-56" />
      </div>
      <Skeleton className="h-[440px] rounded-[28px]" />
    </div>
  );
}
