import { z } from "zod";
import { Id, IsoDateTime } from "./common.js";
import { Symbol } from "./market.js";
import { Thesis } from "./watchlist.js";

/**
 * Partner surface. A partner brings its own users, identified by
 * the partner's id for them, and syncs watchlists. Everything else is the
 * same engine.
 */
export const ExternalId = z.string().trim().min(1).max(120);

export const PartnerUserParams = z.object({ externalId: ExternalId });

/**
 * Free-form labels the partner attaches to a user (their CRM id, segment,
 * anything). Stored verbatim, echoed back, never interpreted by us.
 */
export const PartnerMetadata = z
  .record(z.string().min(1).max(40), z.string().max(200))
  .refine((m) => Object.keys(m).length <= 10, "At most 10 metadata keys");
export type PartnerMetadata = z.infer<typeof PartnerMetadata>;

export const UpsertPartnerUserRequest = z.object({
  name: z.string().trim().min(1).max(80).default("Investor"),
  metadata: PartnerMetadata.optional(),
});

export const PartnerUser = z.object({
  externalId: ExternalId,
  userId: Id,
  watchlistId: Id,
  name: z.string(),
  metadata: PartnerMetadata,
  createdAt: IsoDateTime,
});

export const PartnerUserResponse = z.object({ user: PartnerUser });

export const SyncWatchlistRequest = z.object({
  items: z
    .array(
      z.object({
        symbol: Symbol,
        thesis: Thesis.nullable().default(null),
        addedAt: IsoDateTime.optional(),
        addedPrice: z.number().positive().optional(),
      }),
    )
    .max(100),
});
export type SyncWatchlistRequest = z.infer<typeof SyncWatchlistRequest>;

export const SyncWatchlistResponse = z.object({
  watchlistId: Id,
  itemCount: z.number().int().nonnegative(),
});

export const PartnerSeenRequest = z.object({ seenAt: IsoDateTime.optional() });
