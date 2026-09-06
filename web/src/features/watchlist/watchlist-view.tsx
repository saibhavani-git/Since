"use client";

import Link from "next/link";
import { useState } from "react";
import { CompanyLogo } from "@/components/brand/company-logo";
import { Sparkline } from "@/components/charts/sparkline";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { IconCheck, IconClose, IconPlus, IconTrash } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import type { WatchlistItem } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { pct, rupees, whenLabel } from "@/lib/format";
import { useAddStock } from "./add-stock-provider";
import { usePrimaryWatchlist, useRemoveItem } from "./use-watchlists";

/**
 * A clean ledger: every stock is one quiet row — logo, name, sparkline,
 * price. Tap a row to open the stock; the trash appears on hover.
 */
export function WatchlistView() {
  const { watchlist, isLoading } = usePrimaryWatchlist();
  const { open } = useAddStock();

  if (isLoading) return <WatchlistSkeleton />;

  const items = watchlist?.items ?? [];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-text-3">Your watchlist · {items.length}</p>
          <h1 className="display mt-3 text-[40px] sm:text-[54px]">{items.length === 0 ? "Nothing yet." : "The stocks you care about."}</h1>
          {watchlist?.lastSeenAt ? <p className="mt-3 text-[14px] text-text-3">Last caught up {whenLabel(watchlist.lastSeenAt)}</p> : null}
        </div>
        <Button size="lg" className="rounded-full px-6" onClick={() => open()}>
          <IconPlus width={18} height={18} /> Add a stock
        </Button>
      </header>

      {items.length === 0 ? (
        <Empty
          title="Add the first one."
          body="Search by name or symbol. Then tell Since why you're watching — that's what makes the catch-up personal."
          action={
            <Button size="lg" onClick={() => open()}>
              Add a stock
            </Button>
          }
        />
      ) : watchlist ? (
        <ul className="grid gap-2">
          {items.map((item) => (
            <Row key={item.id} item={item} watchlistId={watchlist.id} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Row({ item, watchlistId }: { item: WatchlistItem; watchlistId: string }) {
  const remove = useRemoveItem(watchlistId);
  const [confirming, setConfirming] = useState(false);
  const q = item.quote;
  const up = (q?.changePct ?? 0) > 0;
  const down = (q?.changePct ?? 0) < 0;

  return (
    <li
      className={cx(
        "group relative grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 rounded-[18px] border bg-surface px-4 py-3.5 transition-colors sm:grid-cols-[minmax(0,1fr)_112px_auto_44px] sm:gap-x-4 sm:px-5",
        confirming ? "border-fall/50" : "border-line hover:border-line-2",
      )}
    >
      <Link href={`/stocks/${item.symbol}`} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-[16px] text-left">
        <CompanyLogo symbol={item.symbol} name={item.instrument.name} size="md" />
        <span className="min-w-0">
          <span className="block truncate text-[16px] font-medium">{item.instrument.name}</span>
          <span className="mt-0.5 flex items-center gap-2 text-[12px] text-text-3">
            <span className="font-mono">{item.symbol}</span>
            {item.instrument.sector ? <span className="truncate">· {item.instrument.sector}</span> : null}
          </span>
        </span>
      </Link>

      <span className="hidden sm:block">{item.sparkline.length > 1 ? <Sparkline values={item.sparkline} width={112} height={30} /> : <span className="block h-[30px] w-[112px] rounded-[8px] bg-canvas-2" />}</span>

      <div className="text-right num">
        {q ? (
          <>
            <p className="text-[16px] font-medium">{rupees(q.price, { decimals: true })}</p>
            <span className={cx("mt-0.5 inline-block rounded-[8px] px-1.5 py-0.5 text-[12px] font-medium", up ? "bg-rise-tint text-rise-strong" : down ? "bg-fall-tint text-fall-strong" : "bg-canvas-2 text-text-3")}>{pct(q.changePct, 2)}</span>
          </>
        ) : (
          <p className="text-[12px] text-text-3">no quote</p>
        )}
      </div>

      <button
        onClick={() => setConfirming(true)}
        aria-label={`Remove ${item.instrument.name}`}
        className="flex size-10 items-center justify-center rounded-[14px] text-text-3 transition-opacity hover:bg-fall-tint hover:text-fall-strong sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
      >
        <IconTrash width={18} height={18} />
      </button>

      {confirming ? (
        <div className="absolute inset-0 z-10 flex items-center justify-between gap-3 rounded-[18px] bg-surface/95 px-5 backdrop-blur-sm">
          <p className="text-[14px]">
            Remove <span className="font-medium">{item.instrument.name}</span> from your watchlist?
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              <IconClose width={14} height={14} /> Keep
            </Button>
            <Button size="sm" variant="danger" loading={remove.isPending} onClick={() => remove.mutate(item.id, { onSettled: () => setConfirming(false) })}>
              <IconCheck width={14} height={14} /> Remove
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function WatchlistSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy>
      <div className="flex items-end justify-between">
        <div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-12 w-72 max-w-full" />
        </div>
        <Skeleton className="hidden h-12 w-32 rounded-full sm:block" />
      </div>
      <div className="grid gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[76px] rounded-[18px]" />
        ))}
      </div>
    </div>
  );
}
