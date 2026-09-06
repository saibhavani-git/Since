import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  checkpoints,
  watchlistItems,
  watchlists,
  type CheckpointRow,
  type WatchlistItemRow,
  type WatchlistRow,
} from "../../db/schema.js";

export class WatchlistRepository {
  constructor(private readonly db: Db) {}

  listByOwner(ownerId: string): Promise<WatchlistRow[]> {
    return this.db.query.watchlists.findMany({ where: eq(watchlists.ownerId, ownerId), orderBy: asc(watchlists.position) });
  }

  findOwned(ownerId: string, id: string): Promise<WatchlistRow | undefined> {
    return this.db.query.watchlists.findFirst({ where: and(eq(watchlists.id, id), eq(watchlists.ownerId, ownerId)) });
  }

  async create(ownerId: string, name: string, position: number): Promise<WatchlistRow> {
    const [row] = await this.db.insert(watchlists).values({ ownerId, name, position }).returning();
    if (!row) throw new Error("insert returned no row");
    return row;
  }

  async rename(id: string, name: string): Promise<void> {
    await this.db.update(watchlists).set({ name }).where(eq(watchlists.id, id));
  }

  async remove(id: string): Promise<void> {
    await this.db.delete(watchlists).where(eq(watchlists.id, id));
  }

  itemsFor(watchlistIds: readonly string[]): Promise<WatchlistItemRow[]> {
    if (watchlistIds.length === 0) return Promise.resolve([]);
    return this.db.query.watchlistItems.findMany({
      where: inArray(watchlistItems.watchlistId, [...watchlistIds]),
      orderBy: asc(watchlistItems.addedAt),
    });
  }

  findItem(watchlistId: string, itemId: string): Promise<WatchlistItemRow | undefined> {
    return this.db.query.watchlistItems.findFirst({
      where: and(eq(watchlistItems.id, itemId), eq(watchlistItems.watchlistId, watchlistId)),
    });
  }

  async addItem(input: {
    watchlistId: string;
    symbol: string;
    thesis: Record<string, unknown> | null;
    addedPrice: number | null;
    addedAt?: Date;
  }): Promise<WatchlistItemRow> {
    const [row] = await this.db
      .insert(watchlistItems)
      .values(input)
      .onConflictDoUpdate({
        target: [watchlistItems.watchlistId, watchlistItems.symbol],
        set: { thesis: input.thesis },
      })
      .returning();
    if (!row) throw new Error("insert returned no row");
    return row;
  }

  async updateThesis(itemId: string, thesis: Record<string, unknown> | null): Promise<void> {
    await this.db.update(watchlistItems).set({ thesis }).where(eq(watchlistItems.id, itemId));
  }

  async removeItem(itemId: string): Promise<void> {
    await this.db.delete(watchlistItems).where(eq(watchlistItems.id, itemId));
  }

  async replaceItems(
    watchlistId: string,
    items: { symbol: string; thesis: Record<string, unknown> | null; addedPrice: number | null; addedAt?: Date }[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(watchlistItems).where(eq(watchlistItems.watchlistId, watchlistId));
      if (items.length) await tx.insert(watchlistItems).values(items.map((i) => ({ ...i, watchlistId })));
    });
  }

  /** Newest checkpoint — optionally only those seen before a cutoff (session grace). */
  latestCheckpoint(watchlistId: string, before?: Date): Promise<CheckpointRow | undefined> {
    return this.db.query.checkpoints.findFirst({
      where: before ? and(eq(checkpoints.watchlistId, watchlistId), lt(checkpoints.seenAt, before)) : eq(checkpoints.watchlistId, watchlistId),
      orderBy: desc(checkpoints.seenAt),
    });
  }

  async latestCheckpoints(watchlistIds: readonly string[]): Promise<Map<string, CheckpointRow>> {
    if (watchlistIds.length === 0) return new Map();
    const rows = await this.db.query.checkpoints.findMany({
      where: inArray(checkpoints.watchlistId, [...watchlistIds]),
      orderBy: desc(checkpoints.seenAt),
    });
    const out = new Map<string, CheckpointRow>();
    for (const r of rows) if (!out.has(r.watchlistId)) out.set(r.watchlistId, r);
    return out;
  }

  async addCheckpoint(watchlistId: string, seenAt: Date, snapshot: Record<string, number>): Promise<CheckpointRow> {
    const [row] = await this.db.insert(checkpoints).values({ watchlistId, seenAt, snapshot }).returning();
    if (!row) throw new Error("insert returned no row");
    return row;
  }

  /** Slide an existing checkpoint forward: same visit, later glance. */
  async updateCheckpoint(id: string, seenAt: Date, snapshot: Record<string, number>): Promise<CheckpointRow> {
    const [row] = await this.db.update(checkpoints).set({ seenAt, snapshot }).where(eq(checkpoints.id, id)).returning();
    if (!row) throw new Error("update returned no row");
    return row;
  }
}
