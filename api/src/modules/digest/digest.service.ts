import type { CardsResponse, Digest, SinceReason, Thesis } from "../../contracts/index.js";
import type { Clock } from "../../lib/clock.js";
import { addDays } from "../../lib/ist.js";
import type { Logger } from "../../lib/logger.js";
import { INDEX_SYMBOL, type RawCandle, type RawQuote } from "../../providers/market-data/index.js";
import type { WatchlistItemRow } from "../../db/schema.js";
import { holidayName, lastCloseBefore, phaseAt, sessionsBetween } from "../market/calendar.js";
import type { MarketService } from "../market/market.service.js";
import type { WatchlistRepository } from "../watchlist/watchlist.repository.js";
import type { WatchlistService } from "../watchlist/watchlist.service.js";
import { buildDigest, DEFAULT_ENGINE_CONFIG, type EngineConfig, type EngineItem } from "./engine/index.js";
import type { StoryService } from "./story.service.js";

const HISTORY_DAYS = 400;

/**
 * Session semantics for the checkpoint. Views are recorded
 * automatically, so "since you last looked" must mean "since your previous
 * visit" — never "since thirty seconds ago when this page loaded".
 *
 * Read side: checkpoints younger than the grace window are ignored, so a
 * refresh mid‑visit answers from the same instant. Write side: views close
 * together coalesce into one checkpoint that slides to the latest glance.
 */
const SESSION_GRACE_MS = 45 * 60_000;
const CHECKPOINT_COALESCE_MS = 15 * 60_000;

export interface DigestOptions {
  /** Caller‑supplied "since"; overrides the checkpoint. */
  since?: Date | undefined;
}

export interface DigestServiceDeps {
  watchlists: WatchlistService;
  watchlistRepo: WatchlistRepository;
  market: MarketService;
  story: StoryService;
  clock: Clock;
  log: Logger;
  config?: EngineConfig;
}

/**
 * Gathers what the engine needs, decides what "since" means, runs the
 * engine, then hands the cards to the story layer for the "why".
 * The only place that knows where data comes from.
 */
export class DigestService {
  private readonly config: EngineConfig;

  constructor(private readonly d: DigestServiceDeps) {
    this.config = d.config ?? DEFAULT_ENGINE_CONFIG;
  }

  async forWatchlist(ownerId: string, watchlistId: string, opts: DigestOptions): Promise<Digest> {
    const { items } = await this.d.watchlists.itemsForEngine(ownerId, watchlistId);
    const now = this.d.clock.now();
    // Only checkpoints from *before* this sitting count; see SESSION_GRACE_MS.
    const checkpoint = await this.d.watchlistRepo.latestCheckpoint(watchlistId, new Date(now.getTime() - SESSION_GRACE_MS));
    const { since, reason } = resolveSince(opts.since, checkpoint?.seenAt ?? null, now);
    const snapshot = reason === "checkpoint" ? (checkpoint?.snapshot ?? {}) : {};

    const symbols = items.map((i) => i.symbol);
    const from = addDays(now, -HISTORY_DAYS);

    // Index + quotes are required; per‑stock history is best‑effort so one bad
    // symbol never blanks the whole catch‑up.
    const [quotes, instruments, indexCandles, ...perSymbol] = await Promise.all([
      this.d.market.quotes([...symbols, INDEX_SYMBOL]),
      this.d.market.instruments(symbols),
      this.d.market.dailyCandles(INDEX_SYMBOL, from),
      ...symbols.map(async (s) => {
        try {
          const [candles, events] = await Promise.all([this.d.market.dailyCandles(s, from), this.d.market.events(s)]);
          return { symbol: s, candles, events };
        } catch (err) {
          this.d.log.warn({ err, symbol: s }, "history unavailable; item skipped");
          return null;
        }
      }),
    ]);

    const bySymbol = new Map(perSymbol.flatMap((p) => (p ? [[p.symbol, p] as const] : [])));
    const engineItems: EngineItem[] = [];
    const unavailable: Digest["unavailable"] = [];
    for (const row of items) {
      const instrument = instruments.get(row.symbol);
      const quote = quotes.get(row.symbol);
      const data = bySymbol.get(row.symbol);
      if (!instrument || !quote || !data || data.candles.length === 0) {
        unavailable.push({ symbol: row.symbol, name: instrument?.name ?? row.symbol });
        continue;
      }
      engineItems.push(toEngineItem(row, instrument, toRaw(quote), data.candles, data.events, snapshot[row.symbol] ?? null));
    }

    const indexQuote = quotes.get(INDEX_SYMBOL);
    const anyStale = [...quotes.values()].some((q) => q.freshness.stale);
    const asOf = indexQuote?.freshness.asOf ?? now.toISOString();

    const digest = buildDigest(
      {
        watchlistId,
        now,
        since,
        sinceReason: reason,
        items: engineItems,
        index: { symbol: INDEX_SYMBOL, quote: indexQuote ? toRaw(indexQuote) : null, candles: indexCandles },
        market: { phase: phaseAt(now), holidayName: holidayName(now), sessions: sessionsBetween(since, now) },
        freshness: {
          asOf,
          delayedMinutes: indexQuote?.freshness.delayedMinutes ?? 0,
          stale: anyStale,
          source: indexQuote?.freshness.source ?? "unknown",
        },
      },
      // News is itself a reason to show a card. The pure price engine cannot
      // know that yet, so hand every priced stock to the story layer; it
      // keeps genuine news/signals and demotes only truly quiet names.
      { ...this.config, maxCards: engineItems.length, minSignals: 0 },
    );

    // Evidence + "why" per stock. Never fails the digest.
    return this.d.story.enrich({ ...digest, unavailable }, { curate: true });
  }

  /**
   * The platform call: "since this moment, for these stocks". No
   * watchlist, no checkpoint, no theses — every symbol we can price gets a
   * card, ordered by how much it mattered. `until` defaults to now; an
   * earlier `until` prices the card at the last close on or before it.
   */
  async forSymbols(symbols: string[], since: Date, until?: Date): Promise<CardsResponse> {
    const now = this.d.clock.now();
    const end = until && until < now ? until : now;
    const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
    const from = addDays(end, -HISTORY_DAYS);

    const [quotes, instruments, indexCandles, ...perSymbol] = await Promise.all([
      this.d.market.quotes([...unique, INDEX_SYMBOL]),
      this.d.market.instruments(unique),
      this.d.market.dailyCandles(INDEX_SYMBOL, from),
      ...unique.map(async (s) => {
        try {
          const [candles, events] = await Promise.all([this.d.market.dailyCandles(s, from), this.d.market.events(s)]);
          return { symbol: s, candles, events };
        } catch (err) {
          this.d.log.warn({ err, symbol: s }, "history unavailable; item skipped");
          return null;
        }
      }),
    ]);

    const bySymbol = new Map(perSymbol.flatMap((p) => (p ? [[p.symbol, p] as const] : [])));
    const items: EngineItem[] = [];
    const unavailable: Digest["unavailable"] = [];
    for (const symbol of unique) {
      const instrument = instruments.get(symbol);
      const quote = quotes.get(symbol);
      const data = bySymbol.get(symbol);
      if (!instrument || !quote || !data || data.candles.length === 0) {
        unavailable.push({ symbol, name: instrument?.name ?? symbol });
        continue;
      }
      const candles = end < now ? data.candles.filter((c) => c.t <= end) : data.candles;
      const raw = end < now ? asOfClose(toRaw(quote), candles) : toRaw(quote);
      items.push({
        symbol,
        instrument,
        thesis: null,
        addedAt: since,
        addedPrice: null,
        quote: raw,
        candles,
        events: {
          nextResultsAt: data.events.nextResultsAt ? new Date(data.events.nextResultsAt) : null,
          lastResultsAt: data.events.lastResultsAt ? new Date(data.events.lastResultsAt) : null,
          exDividendAt: data.events.exDividendAt ? new Date(data.events.exDividendAt) : null,
        },
        snapshotPrice: null,
      });
    }

    const indexQuote = quotes.get(INDEX_SYMBOL);
    const indexRaw = indexQuote ? (end < now ? asOfClose(toRaw(indexQuote), indexCandles.filter((c) => c.t <= end)) : toRaw(indexQuote)) : null;
    const digest = buildDigest(
      {
        watchlistId: "00000000-0000-0000-0000-000000000000",
        now: end,
        since,
        sinceReason: "requested",
        items,
        index: { symbol: INDEX_SYMBOL, quote: indexRaw, candles: end < now ? indexCandles.filter((c) => c.t <= end) : indexCandles },
        market: { phase: phaseAt(end), holidayName: holidayName(end), sessions: sessionsBetween(since, end) },
        freshness: {
          asOf: indexQuote?.freshness.asOf ?? end.toISOString(),
          delayedMinutes: indexQuote?.freshness.delayedMinutes ?? 0,
          stale: [...quotes.values()].some((q) => q.freshness.stale),
          source: indexQuote?.freshness.source ?? "unknown",
        },
      },
      // Every stock asked for gets a card; nothing is demoted to "quiet".
      { ...this.config, maxCards: unique.length, minSignals: 0 },
    );
    const enriched = await this.d.story.enrich(digest);
    return {
      since: since.toISOString(),
      until: end.toISOString(),
      generatedAt: now.toISOString(),
      gap: enriched.gap,
      market: enriched.market,
      freshness: enriched.freshness,
      cards: enriched.cards,
      unavailable,
    };
  }

  /**
   * Record "the user looked", with the prices they saw. Views in the
   * same sitting coalesce into one checkpoint that slides to the latest
   * glance, so the next visit reads "since" from exactly where this one ended.
   */
  async markSeen(ownerId: string, watchlistId: string, at?: Date): Promise<{ seenAt: Date; snapshotCount: number }> {
    const { items } = await this.d.watchlists.itemsForEngine(ownerId, watchlistId);
    const seenAt = at ?? this.d.clock.now();
    const snapshot: Record<string, number> = {};
    if (items.length) {
      try {
        const quotes = await this.d.market.quotes(items.map((i) => i.symbol));
        for (const [symbol, q] of quotes) snapshot[symbol] = q.price;
      } catch (err) {
        // A checkpoint without prices is still a checkpoint; the engine falls back to candles.
        this.d.log.warn({ err }, "checkpoint stored without price snapshot");
      }
    }
    const latest = await this.d.watchlistRepo.latestCheckpoint(watchlistId);
    if (latest && seenAt.getTime() - latest.seenAt.getTime() < CHECKPOINT_COALESCE_MS) {
      await this.d.watchlistRepo.updateCheckpoint(latest.id, seenAt, snapshot);
    } else {
      await this.d.watchlistRepo.addCheckpoint(watchlistId, seenAt, snapshot);
    }
    return { seenAt, snapshotCount: Object.keys(snapshot).length };
  }

}

/** Checkpoint → previous close → first visit (one week). Caller override wins. */
export function resolveSince(requested: Date | undefined, checkpoint: Date | null, now: Date): { since: Date; reason: SinceReason } {
  if (requested && requested < now) return { since: requested, reason: "requested" };
  if (checkpoint) return { since: checkpoint, reason: "checkpoint" };
  const lastClose = lastCloseBefore(now);
  if (phaseAt(now) === "open") return { since: lastClose, reason: "previous_close" };
  return { since: addDays(now, -7), reason: "first_visit" };
}

function toEngineItem(
  row: WatchlistItemRow,
  instrument: EngineItem["instrument"],
  quote: RawQuote,
  candles: RawCandle[],
  events: { nextResultsAt: string | null; lastResultsAt: string | null; exDividendAt: string | null },
  snapshotPrice: number | null,
): EngineItem {
  return {
    symbol: row.symbol,
    instrument,
    thesis: (row.thesis as Thesis | null) ?? null,
    addedAt: row.addedAt,
    addedPrice: row.addedPrice,
    quote,
    candles,
    events: {
      nextResultsAt: events.nextResultsAt ? new Date(events.nextResultsAt) : null,
      lastResultsAt: events.lastResultsAt ? new Date(events.lastResultsAt) : null,
      exDividendAt: events.exDividendAt ? new Date(events.exDividendAt) : null,
    },
    snapshotPrice,
  };
}

/** The engine works on provider shapes; the contract Quote is the same data with freshness attached. */
function toRaw(q: { symbol: string; price: number; previousClose: number; open: number | null; dayHigh: number | null; dayLow: number | null; volume: number | null; averageVolume: number | null; fiftyTwoWeekHigh: number | null; fiftyTwoWeekLow: number | null; freshness: { asOf: string } }): RawQuote {
  return {
    symbol: q.symbol,
    price: q.price,
    previousClose: q.previousClose,
    open: q.open,
    dayHigh: q.dayHigh,
    dayLow: q.dayLow,
    volume: q.volume,
    averageVolume: q.averageVolume,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow,
    asOf: new Date(q.freshness.asOf),
  };
}

/** A quote as of a past moment: the last close we have, with no intraday fields. */
function asOfClose(quote: RawQuote, candles: RawCandle[]): RawQuote {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  if (!last) return quote;
  return { ...quote, price: last.c, previousClose: prev?.c ?? last.c, open: last.o, dayHigh: last.h, dayLow: last.l, volume: last.v, asOf: last.t };
}
