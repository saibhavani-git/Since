import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { partnerUsers, partners, users, watchlists } from "../../db/schema.js";
import { sha256 } from "../../lib/ids.js";

export interface PartnerRow {
  id: string;
  name: string;
}

export interface PartnerUserRow {
  id: string;
  partnerId: string;
  externalId: string;
  userId: string;
  watchlistId: string;
  metadata: Record<string, string>;
  createdAt: Date;
}

export class PartnerRepository {
  constructor(private readonly db: Db) {}

  /** Keys are stored hashed; a leaked database does not leak keys. */
  async findByKey(apiKey: string): Promise<PartnerRow | null> {
    const row = await this.db.query.partners.findFirst({
      where: and(eq(partners.keyHash, sha256(apiKey)), eq(partners.active, true)),
    });
    return row ? { id: row.id, name: row.name } : null;
  }

  findUser(partnerId: string, externalId: string): Promise<PartnerUserRow | undefined> {
    return this.db.query.partnerUsers.findFirst({
      where: and(eq(partnerUsers.partnerId, partnerId), eq(partnerUsers.externalId, externalId)),
    });
  }

  /** Creates the shadow user, its single watchlist and the mapping in one transaction. */
  async createUser(partnerId: string, externalId: string, name: string, metadata: Record<string, string> = {}): Promise<PartnerUserRow> {
    return this.db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ name }).returning();
      if (!user) throw new Error("insert returned no row");
      const [list] = await tx.insert(watchlists).values({ ownerId: user.id, name: "Watchlist", position: 0 }).returning();
      if (!list) throw new Error("insert returned no row");
      const [mapping] = await tx
        .insert(partnerUsers)
        .values({ partnerId, externalId, userId: user.id, watchlistId: list.id, metadata })
        .returning();
      if (!mapping) throw new Error("insert returned no row");
      return mapping;
    });
  }

  async updateUser(userId: string, patch: { name?: string }): Promise<void> {
    await this.db.update(users).set(patch).where(eq(users.id, userId));
  }

  /** Replaces the partner's labels for this user wholesale — send the full set each time. */
  async updateMetadata(mappingId: string, metadata: Record<string, string>): Promise<PartnerUserRow> {
    const [row] = await this.db.update(partnerUsers).set({ metadata }).where(eq(partnerUsers.id, mappingId)).returning();
    if (!row) throw new Error("update returned no row");
    return row;
  }
}
