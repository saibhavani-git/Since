import {
  AddItemRequest,
  CreateWatchlistRequest,
  ItemParams,
  Ok,
  RenameWatchlistRequest,
  UpdateItemRequest,
  WatchlistParams,
  WatchlistResponse,
  WatchlistsResponse,
} from "../../contracts/index.js";
import { requireUser, userId } from "../../http/authenticate.js";
import type { App } from "../../http/app-types.js";
import type { WatchlistService } from "./watchlist.service.js";

export function registerWatchlistRoutes(app: App, watchlists: WatchlistService): void {
  const tags = ["watchlists"];
  const security = [{ session: [] }];

  app.get("/v1/watchlists", {
    schema: { tags, security, response: { 200: WatchlistsResponse } },
    preHandler: requireUser,
    handler: async (req) => ({ watchlists: await watchlists.list(userId(req)) }),
  });

  app.post("/v1/watchlists", {
    schema: { tags, security, body: CreateWatchlistRequest, response: { 201: WatchlistResponse } },
    preHandler: requireUser,
    handler: async (req, reply) => reply.status(201).send({ watchlist: await watchlists.create(userId(req), req.body.name) }),
  });

  app.get("/v1/watchlists/:watchlistId", {
    schema: { tags, security, params: WatchlistParams, response: { 200: WatchlistResponse } },
    preHandler: requireUser,
    handler: async (req) => ({ watchlist: await watchlists.get(userId(req), req.params.watchlistId) }),
  });

  app.patch("/v1/watchlists/:watchlistId", {
    schema: { tags, security, params: WatchlistParams, body: RenameWatchlistRequest, response: { 200: WatchlistResponse } },
    preHandler: requireUser,
    handler: async (req) => {
      await watchlists.rename(userId(req), req.params.watchlistId, req.body.name);
      return { watchlist: await watchlists.get(userId(req), req.params.watchlistId) };
    },
  });

  app.delete("/v1/watchlists/:watchlistId", {
    schema: { tags, security, params: WatchlistParams, response: { 200: Ok } },
    preHandler: requireUser,
    handler: async (req) => {
      await watchlists.remove(userId(req), req.params.watchlistId);
      return { ok: true as const };
    },
  });

  app.post("/v1/watchlists/:watchlistId/items", {
    schema: { tags, security, params: WatchlistParams, body: AddItemRequest, response: { 200: WatchlistResponse } },
    preHandler: requireUser,
    handler: async (req) => ({ watchlist: await watchlists.addItem(userId(req), req.params.watchlistId, req.body) }),
  });

  app.patch("/v1/watchlists/:watchlistId/items/:itemId", {
    schema: { tags, security, params: ItemParams, body: UpdateItemRequest, response: { 200: WatchlistResponse } },
    preHandler: requireUser,
    handler: async (req) => ({
      watchlist: await watchlists.updateThesis(userId(req), req.params.watchlistId, req.params.itemId, req.body.thesis),
    }),
  });

  app.delete("/v1/watchlists/:watchlistId/items/:itemId", {
    schema: { tags, security, params: ItemParams, response: { 200: WatchlistResponse } },
    preHandler: requireUser,
    handler: async (req) => ({ watchlist: await watchlists.removeItem(userId(req), req.params.watchlistId, req.params.itemId) }),
  });
}
