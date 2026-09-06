import { z } from "zod";
import { CardsRequest, CardsResponse, DigestQuery, DigestResponse, NewsResponse, ReportQuery, ReportResponse, SeenResponse, SpeechRequest, Symbol, WatchlistParams } from "../../contracts/index.js";
import { requireAny, requireUser, userId } from "../../http/authenticate.js";
import type { App } from "../../http/app-types.js";
import { UnauthorizedError } from "../../lib/errors.js";
import type { SpeechSynthesizer } from "../../providers/speech/index.js";
import type { DigestService } from "./digest.service.js";
import type { StoryService } from "./story.service.js";

export interface DigestRouteDeps {
  digests: DigestService;
  story: StoryService;
  speech: SpeechSynthesizer;
}

export function registerDigestRoutes(app: App, { digests, story, speech }: DigestRouteDeps): void {
  const tags = ["digest"];
  const security = [{ session: [] }];

  app.get("/v1/watchlists/:watchlistId/digest", {
    schema: { tags, security, params: WatchlistParams, querystring: DigestQuery, response: { 200: DigestResponse } },
    preHandler: requireUser,
    handler: async (req) => {
      const uid = userId(req);
      const digest = await digests.forWatchlist(uid, req.params.watchlistId, {
        since: req.query.since ? new Date(req.query.since) : undefined,
      });
      return { digest };
    },
  });

  /**
   * The platform call. "Since this moment, for these stocks" → one
   * card each, with the numbers, the story as a paragraph, and the narration
   * to read aloud. Sessions and partner keys may both call it.
   */
  app.post("/v1/digest/cards", {
    schema: {
      tags,
      security: [{ session: [] }, { apiKey: [] }],
      body: CardsRequest,
      response: { 200: CardsResponse },
      description: "Cards for a set of symbols over a window. Every symbol that can be priced gets a card; ordering is by how much each change mattered.",
    },
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    preHandler: requireAny,
    handler: async (req) => {
      return digests.forSymbols(req.body.symbols, new Date(req.body.since), req.body.until ? new Date(req.body.until) : undefined);
    },
  });

  app.post("/v1/watchlists/:watchlistId/digest/seen", {
    schema: { tags, security, params: WatchlistParams, response: { 200: SeenResponse } },
    preHandler: requireUser,
    handler: async (req) => {
      const { seenAt, snapshotCount } = await digests.markSeen(userId(req), req.params.watchlistId);
      return { seenAt: seenAt.toISOString(), snapshotCount };
    },
  });

  /**
   * Voice for one script segment. Sessions and partner keys may both call it.
   * Returns raw audio; the response schema is intentionally absent (binary).
   */
  app.post("/v1/speech", {
    schema: {
      tags,
      security: [{ session: [] }, { apiKey: [] }],
      body: SpeechRequest,
      description: "Returns audio/mpeg bytes for one narration segment.",
    },
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    preHandler: async (req) => {
      if (!req.principal) throw new UnauthorizedError();
    },
    handler: async (req, reply) => {
      const audio = await speech.synthesize({ text: req.body.text });
      reply.header("cache-control", "private, max-age=3600");
      return reply.type(audio.mimeType).send(Buffer.from(audio.bytes));
    },
  });

  /** The in‑depth view behind a card. Any signed‑in user or partner key. */
  app.get("/v1/market/stocks/:symbol/report", {
    schema: {
      tags,
      security: [{ session: [] }, { apiKey: [] }],
      params: z.object({ symbol: Symbol }),
      querystring: ReportQuery,
      response: { 200: ReportResponse },
    },
    preHandler: async (req) => {
      if (!req.principal) throw new UnauthorizedError();
    },
    handler: async (req) => {
      const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 7 * 86_400_000);
      return { report: await story.report(req.params.symbol, since) };
    },
  });

  /** The paper trail behind a stock: filings and press for a window, links included. */
  app.get("/v1/market/stocks/:symbol/news", {
    schema: {
      tags,
      security: [{ session: [] }, { apiKey: [] }],
      params: z.object({ symbol: Symbol }),
      querystring: ReportQuery,
      response: { 200: NewsResponse },
      description: "Filings and news for one stock since an instant. Sources only — the written story lives on the report.",
    },
    preHandler: async (req) => {
      if (!req.principal) throw new UnauthorizedError();
    },
    handler: async (req) => {
      const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 7 * 86_400_000);
      return { symbol: req.params.symbol, since: since.toISOString(), sources: await story.sources(req.params.symbol, since) };
    },
  });

  app.get("/v1/speech/status", {
    schema: { tags, response: { 200: z.object({ enabled: z.boolean(), provider: z.string() }) } },
    handler: async () => ({ enabled: speech.enabled, provider: speech.name }),
  });
}
