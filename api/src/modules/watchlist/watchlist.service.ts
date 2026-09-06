import type { AddItemRequest, Thesis, Watchlist, WatchlistItem } from "../../contracts/index.js";
import type { Clock } from "../../lib/clock.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import type { WatchlistItemRow, WatchlistRow } from "../../db/schema.js";
import type { MarketService } from "../market/market.service.js";
import type { WatchlistRepository } from "./watchlist.repository.js";

const MAX_ITEMS = 50;
const DEFAULT_NAME = "My watchlist";

/**
 * Watchlists, items, theses and checkpoints. Quotes are attached on read so
 * the list is always live; the persisted row is only what the user decided.
 */
export class WatchlistService {
  constructor(
    private readonly repo: WatchlistRepository,
    private readonly market: MarketService,
    private readonly clock: Clock,
  ) {}

  /** Every verified user gets one list; partner users get one per partner. */
  async ensureDefault(ownerId: string, name = DEFAULT_NAME): Promise<WatchlistRow> {
    const existing = await this.repo.listByOwner(ownerId);
    return existing[0] ?? this.repo.create(ownerId, name, 0);
  }

  async list(ownerId: string): Promise<Watchlist[]> {
    const rows = await this.repo.listByOwner(ownerId);
    return this.hydrate(rows);
  }

  async get(ownerId: string, watchlistId: string): Promise<Watchlist> {
    const row = await this.requireOwned(ownerId, watchlistId);
    const [w] = await this.hydrate([row]);
    if (!w) throw new NotFoundError("Watchlist");
    return w;
  }

  async create(ownerId: string, name: string): Promise<Watchlist> {
    const existing = await this.repo.listByOwner(ownerId);
    const row = await this.repo.create(ownerId, name, existing.length);
    const [w] = await this.hydrate([row]);
    return w!;
  }

  async rename(ownerId: string, watchlistId: string, name: string): Promise<void> {
    await this.requireOwned(ownerId, watchlistId);
    await this.repo.rename(watchlistId, name);
  }

  async remove(ownerId: string, watchlistId: string): Promise<void> {
    await this.requireOwned(ownerId, watchlistId);
    await this.repo.remove(watchlistId);
  }

  async addItem(ownerId: string, watchlistId: string, input: AddItemRequest): Promise<Watchlist> {
    await this.requireOwned(ownerId, watchlistId);
    const items = await this.repo.itemsFor([watchlistId]);
    if (items.length >= MAX_ITEMS && !items.some((i) => i.symbol === input.symbol)) {
      throw new ConflictError(`A watchlist holds up to ${MAX_ITEMS} stocks`);
    }
    await this.market.instrument(input.symbol); // 404 if unknown
    const quote = (await this.market.quotes([input.symbol])).get(input.symbol);
    await this.repo.addItem({
      watchlistId,
      symbol: input.symbol,
      thesis: input.thesis,
      addedPrice: quote?.price ?? null,
      addedAt: this.clock.now(),
    });
    return this.get(ownerId, watchlistId);
  }

  async updateThesis(ownerId: string, watchlistId: string, itemId: string, thesis: Thesis | null): Promise<Watchlist> {
    await this.requireOwned(ownerId, watchlistId);
    const item = await this.repo.findItem(watchlistId, itemId);
    if (!item) throw new NotFoundError("Stock in watchlist");
    await this.repo.updateThesis(itemId, thesis);
    return this.get(ownerId, watchlistId);
  }

  async removeItem(ownerId: string, watchlistId: string, itemId: string): Promise<Watchlist> {
    await this.requireOwned(ownerId, watchlistId);
    const item = await this.repo.findItem(watchlistId, itemId);
    if (!item) throw new NotFoundError("Stock in watchlist");
    await this.repo.removeItem(itemId);
    return this.get(ownerId, watchlistId);
  }

  /** Raw rows for the digest engine (no quotes attached). */
  async itemsForEngine(ownerId: string, watchlistId: string): Promise<{ list: WatchlistRow; items: WatchlistItemRow[] }> {
    const list = await this.requireOwned(ownerId, watchlistId);
    const items = await this.repo.itemsFor([watchlistId]);
    return { list, items };
  }

  async requireOwned(ownerId: string, watchlistId: string): Promise<WatchlistRow> {
    const row = await this.repo.findOwned(ownerId, watchlistId);
    if (!row) throw new NotFoundError("Watchlist");
    return row;
  }

  private async hydrate(rows: WatchlistRow[]): Promise<Watchlist[]> {
    const ids = rows.map((r) => r.id);
    const [items, seen] = await Promise.all([this.repo.itemsFor(ids), this.repo.latestCheckpoints(ids)]);
    const symbols = [...new Set(items.map((i) => i.symbol))];
    const [instruments, quotes, sparklines] = await Promise.all([this.market.instruments(symbols), this.quotesOrEmpty(symbols), this.sparklinesOrEmpty(symbols)]);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      position: row.position,
      lastSeenAt: seen.get(row.id)?.seenAt.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      items: items
        .filter((i) => i.watchlistId === row.id)
        .flatMap((i): WatchlistItem[] => {
          const instrument = instruments.get(i.symbol);
          if (!instrument) return [];
          return [
            {
              id: i.id,
              symbol: i.symbol,
              instrument,
              thesis: (i.thesis as Thesis | null) ?? null,
              addedAt: i.addedAt.toISOString(),
              addedPrice: i.addedPrice,
              quote: quotes.get(i.symbol) ?? null,
              sparkline: sparklines.get(i.symbol) ?? [],
            },
          ];
        }),
    }));
  }

  /** A month of closes per symbol for the row sparklines. Each symbol fails independently. */
  private async sparklinesOrEmpty(symbols: string[]): Promise<Map<string, number[]>> {
    const out = new Map<string, number[]>();
    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const { candles } = await this.market.candles(symbol, "1M");
          out.set(symbol, candles.map((c) => c.c));
        } catch {
          out.set(symbol, []);
        }
      }),
    );
    return out;
  }

  /** A watchlist must render even when the market feed is down; quotes become null. */
  private async quotesOrEmpty(symbols: string[]) {
    try {
      return await this.market.quotes(symbols);
    } catch {
      return new Map<string, never>();
    }
  }
}
