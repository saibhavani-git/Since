import {
  DigestQuery,
  DigestResponse,
  PartnerSeenRequest,
  PartnerUserParams,
  PartnerUserResponse,
  SeenResponse,
  SyncWatchlistRequest,
  SyncWatchlistResponse,
  UpsertPartnerUserRequest,
} from "../../contracts/index.js";
import { partnerId, requirePartner } from "../../http/authenticate.js";
import type { App } from "../../http/app-types.js";
import type { PartnerService } from "./partner.service.js";

/** Same engine, the partner's users, API‑key auth. */
export function registerPartnerRoutes(app: App, partner: PartnerService): void {
  const tags = ["partner"];
  const security = [{ apiKey: [] }];

  app.put("/v1/partner/users/:externalId", {
    schema: { tags, security, params: PartnerUserParams, body: UpsertPartnerUserRequest, response: { 200: PartnerUserResponse } },
    preHandler: requirePartner,
    handler: async (req) => ({
      user: await partner.upsertUser(partnerId(req), req.params.externalId, req.body.name, req.body.metadata),
    }),
  });

  app.put("/v1/partner/users/:externalId/watchlist", {
    schema: { tags, security, params: PartnerUserParams, body: SyncWatchlistRequest, response: { 200: SyncWatchlistResponse } },
    preHandler: requirePartner,
    handler: async (req) => partner.syncWatchlist(partnerId(req), req.params.externalId, req.body),
  });

  app.get("/v1/partner/users/:externalId/digest", {
    schema: { tags, security, params: PartnerUserParams, querystring: DigestQuery, response: { 200: DigestResponse } },
    preHandler: requirePartner,
    handler: async (req) => ({
      digest: await partner.digest(partnerId(req), req.params.externalId, {
        since: req.query.since ? new Date(req.query.since) : undefined,
      }),
    }),
  });

  app.post("/v1/partner/users/:externalId/digest/seen", {
    schema: { tags, security, params: PartnerUserParams, body: PartnerSeenRequest, response: { 200: SeenResponse } },
    preHandler: requirePartner,
    handler: async (req) => {
      const { seenAt, snapshotCount } = await partner.markSeen(partnerId(req), req.params.externalId, req.body.seenAt ? new Date(req.body.seenAt) : undefined);
      return { seenAt: seenAt.toISOString(), snapshotCount };
    },
  });
}
