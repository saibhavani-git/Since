"use client";

import { useEffect, useMemo, useState } from "react";
import { CompanyLogo } from "@/components/brand/company-logo";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { IconArrowLeft, IconCheck, IconSearch } from "@/components/ui/icons";
import { Pill, toneOf } from "@/components/ui/pill";
import { Spinner } from "@/components/ui/spinner";
import { useSearch, useStock } from "@/features/market/use-market";
import type { Instrument } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { pct, rupees } from "@/lib/format";
import { buildThesis, type ThesisKind } from "./thesis";
import { ThesisPicker } from "./thesis-picker";
import { useAddItem, useCreateWatchlist, usePrimaryWatchlist } from "./use-watchlists";

type Step = { kind: "search" } | { kind: "thesis"; instrument: Instrument };

/**
 * Search → pick → say why. Two screens, no page change. Enter on a highlighted
 * result moves on; Enter on the thesis screen adds. The whole flow is under
 * ten seconds, which is the point.
 */
export function AddStockDialog({ open, initialSymbol, onClose }: { open: boolean; initialSymbol?: string; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Add a stock">
      {/* Dialog unmounts its children when closed, so the flow's state resets on every open. */}
      <AddStockFlow initialSymbol={initialSymbol} onClose={onClose} />
    </Dialog>
  );
}

function AddStockFlow({ initialSymbol, onClose }: { initialSymbol?: string; onClose: () => void }) {
  const { watchlist } = usePrimaryWatchlist();
  const createList = useCreateWatchlist();
  const [q, setQ] = useState(initialSymbol ?? "");
  const [step, setStep] = useState<Step>({ kind: "search" });

  // A first-time user has no list yet; make one quietly so "add" always works.
  useEffect(() => {
    if (watchlist === null && createList.isIdle) createList.mutate("Watchlist");
  }, [watchlist, createList]);

  return (
    <>
      {step.kind === "search" ? (
        <SearchStep q={q} onQ={setQ} watched={new Set(watchlist?.items.map((i) => i.symbol))} onPick={(instrument) => setStep({ kind: "thesis", instrument })} />
      ) : watchlist ? (
        <ThesisStep watchlistId={watchlist.id} instrument={step.instrument} onBack={() => setStep({ kind: "search" })} onDone={onClose} />
      ) : (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="size-5 text-text-3" />
        </div>
      )}
    </>
  );
}

function SearchStep({ q, onQ, watched, onPick }: { q: string; onQ: (v: string) => void; watched: Set<string>; onPick: (i: Instrument) => void }) {
  const search = useSearch(useDebounced(q, 220));
  const results = useMemo(() => search.data ?? [], [search.data]);
  // Highlight resets with the query (event-driven) and is clamped to the current results.
  const [rawCursor, setCursor] = useState(0);
  const cursor = Math.min(rawCursor, Math.max(0, results.length - 1));

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor(Math.min(results.length - 1, cursor + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor(Math.max(0, cursor - 1));
    } else if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      onPick(results[cursor]);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <IconSearch className="shrink-0 text-text-3" />
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            onQ(e.target.value);
            setCursor(0);
          }}
          onKeyDown={onKey}
          placeholder="Search by name or symbol — Reliance, HDFCBANK, Zomato…"
          className="h-8 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-text-3"
          aria-label="Search stocks"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="stock-results"
          aria-activedescendant={results[cursor] ? `opt-${results[cursor].symbol}` : undefined}
        />
        {search.isFetching ? <Spinner className="size-4 text-text-3" /> : null}
      </div>
      <ul id="stock-results" role="listbox" className="max-h-[50dvh] overflow-y-auto p-2">
        {q.trim() === "" ? (
          <li className="px-3 py-8 text-center text-[14px] text-text-3">Start typing a name or symbol.</li>
        ) : results.length === 0 && !search.isFetching ? (
          <li className="px-3 py-8 text-center text-[14px] text-text-3">Nothing matched &ldquo;{q}&rdquo;.</li>
        ) : (
          results.map((r, i) => {
            const isWatched = watched.has(r.symbol);
            return (
              <li
                key={r.symbol}
                id={`opt-${r.symbol}`}
                role="option"
                aria-selected={i === cursor}
                onMouseEnter={() => setCursor(i)}
                onClick={() => onPick(r)}
                className={cx("flex cursor-pointer items-center gap-3 rounded-[14px] px-3 py-2.5", i === cursor && "bg-canvas")}
              >
                <CompanyLogo symbol={r.symbol} name={r.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px]">{r.name}</span>
                  <span className="block font-mono text-[11px] tracking-wide text-text-3">
                    {r.symbol} · {r.exchange}
                  </span>
                </span>
                {isWatched ? (
                  <Pill tone="iris">
                    <IconCheck width={12} height={12} /> watching
                  </Pill>
                ) : r.sector ? (
                  <span className="hidden sm:inline text-[12px] text-text-3">{r.sector}</span>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </>
  );
}

function ThesisStep({ watchlistId, instrument, onBack, onDone }: { watchlistId: string; instrument: Instrument; onBack: () => void; onDone: () => void }) {
  const stock = useStock(instrument.symbol);
  const add = useAddItem(watchlistId);
  const [kind, setKind] = useState<ThesisKind>("curious");
  const [price, setPrice] = useState("");

  const thesis = buildThesis(kind, price ? Number(price) : null);
  const needsPrice = kind === "target_price" || kind === "breakout_above";
  const canAdd = !needsPrice || thesis !== null;

  const submit = () => {
    if (!canAdd) return;
    add.mutate({ symbol: instrument.symbol, thesis }, { onSuccess: onDone });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col"
    >
      <div className="flex items-start gap-3 px-5 pt-5">
        <button type="button" onClick={onBack} aria-label="Back to search" className="mt-0.5 rounded-md p-1 text-text-2 hover:text-text">
          <IconArrowLeft />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[12px] tracking-wide text-text-3">
            {instrument.symbol} · {instrument.exchange}
          </p>
          <h2 className="display mt-1 truncate text-[24px]">{instrument.name}</h2>
        </div>
        {stock.data ? (
          <div className="text-right num">
            <p className="text-[16px] font-medium">{rupees(stock.data.quote.price, { decimals: true })}</p>
            <p className={cx("text-[12px]", toneOf(stock.data.quote.changePct) === "rise" ? "text-rise-strong" : toneOf(stock.data.quote.changePct) === "fall" ? "text-fall-strong" : "text-text-3")}>
              {pct(stock.data.quote.changePct, 2)} today
            </p>
          </div>
        ) : null}
      </div>
      <div className="px-5 pt-6">
        <p className="text-[14px] font-medium">Why are you watching this?</p>
        <p className="mb-3 text-[13px] text-text-3">Optional, but it&apos;s how Since knows what matters to you.</p>
        <ThesisPicker kind={kind} price={price} onKind={setKind} onPrice={setPrice} currentPrice={stock.data?.quote.price} />
      </div>
      {add.error ? (
        <p role="alert" className="mx-5 mt-4 rounded-[14px] bg-fall-tint px-4 py-3 text-[14px] text-fall-strong">
          {add.error.message}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2 px-5 py-5">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" size="lg" disabled={!canAdd} loading={add.isPending}>
          Add to watchlist
        </Button>
      </div>
    </form>
  );
}

/** The value, once it has stopped changing for `ms`. Keeps typing from firing a request per keystroke. */
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
