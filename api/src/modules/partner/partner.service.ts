import type { Digest, SyncWatchlistRequest } from "../../contracts/index.js";
import { NotFoundError } from "../../lib/errors.js";
import type { AuthRepository } from "../auth/auth.repository.js";
import type { DigestService } from "../digest/digest.service.js";
import type { MarketService } from "../market/market.service.js";
import type { WatchlistRepository } from "../watchlist/watchlist.repository.js";
import type { PartnerRepository, PartnerUserRow } from "./partner.repository.js";

export interface PartnerUserView {
  externalId: string;
  userId: string;
  watchlistId: string;
  name: string;
  metadata: Record<string, string>;
  createdAt: string;
}

export interface PartnerServiceDeps {
  partners: PartnerRepository;
  users: AuthRepository;
  watchlistRepo: WatchlistRepository;
  market: MarketService;
  digests: DigestService;
}

/**
 * The partner façade: translate (partnerId, externalId) into our
 * user + watchlist, then reuse the same services the app uses.
 */
export class PartnerService {
  constructor(private readonly d: PartnerServiceDeps) {}

  async upsertUser(partnerId: string, externalId: string, name: string, metadata?: Record<string, string>): Promise<PartnerUserView> {
    const existing = await this.d.partners.findUser(partnerId, externalId);
    let mapping = existing ?? (await this.d.partners.createUser(partnerId, externalId, name, metadata));
    if (existing) {
      await this.d.partners.updateUser(existing.userId, { name });
      if (metadata) mapping = await this.d.partners.updateMetadata(existing.id, metadata);
    }
    return this.view(mapping);
  }

  async syncWatchlist(partnerId: string, externalId: string, input: SyncWatchlistRequest): Promise<{ watchlistId: string; itemCount: number }> {
    const mapping = await this.requireUser(partnerId, externalId);
    const symbols = [...new Set(input.items.map((i) => i.symbol))];
    const known = await this.d.market.instruments(symbols);
    const unknown = symbols.filter((s) => !known.has(s));
    if (unknown.length) throw new NotFoundError(`Stock ${unknown.join(", ")}`);

    // Missing addedPrice → today's price, so "since you added it" still works for partner users.
    const quotes = input.items.some((i) => i.addedPrice == null) ? await this.quotesOrEmpty(symbols) : new Map<string, { price: number }>();

    await this.d.watchlistRepo.replaceItems(
      mapping.watchlistId,
      input.items.map((i) => ({
        symbol: i.symbol,
        thesis: i.thesis,
        addedPrice: i.addedPrice ?? quotes.get(i.symbol)?.price ?? null,
        ...(i.addedAt ? { addedAt: new Date(i.addedAt) } : {}),
      })),
    );
    return { watchlistId: mapping.watchlistId, itemCount: input.items.length };
  }

  async digest(partnerId: string, externalId: string, opts: { since?: Date | undefined }): Promise<Digest> {
    const mapping = await this.requireUser(partnerId, externalId);
    return this.d.digests.forWatchlist(mapping.userId, mapping.watchlistId, opts);
  }

  async markSeen(partnerId: string, externalId: string, at?: Date): Promise<{ seenAt: Date; snapshotCount: number }> {
    const mapping = await this.requireUser(partnerId, externalId);
    return this.d.digests.markSeen(mapping.userId, mapping.watchlistId, at);
  }

  private async requireUser(partnerId: string, externalId: string): Promise<PartnerUserRow> {
    const mapping = await this.d.partners.findUser(partnerId, externalId);
    if (!mapping) throw new NotFoundError(`User ${externalId}`);
    return mapping;
  }

  private async view(mapping: PartnerUserRow): Promise<PartnerUserView> {
    const user = await this.d.users.findUserById(mapping.userId);
    return {
      externalId: mapping.externalId,
      userId: mapping.userId,
      watchlistId: mapping.watchlistId,
      name: user?.name ?? "Investor",
      metadata: mapping.metadata,
      createdAt: mapping.createdAt.toISOString(),
    };
  }

  private async quotesOrEmpty(symbols: string[]) {
    try {
      return await this.d.market.quotes(symbols);
    } catch {
      return new Map<string, { price: number }>();
    }
  }
}
