import Fastify, { type FastifyBaseLogger } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import type { Env } from "./config/env.js";
import type { App } from "./http/app-types.js";
import { createAuthenticate } from "./http/authenticate.js";
import { errorHandler } from "./http/errors.js";
import { registerOpenApi } from "./http/openapi.js";
import type { Logger } from "./lib/logger.js";
import type { AuthService } from "./modules/auth/auth.service.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import type { TokenService } from "./modules/auth/tokens.js";
import type { DigestService } from "./modules/digest/digest.service.js";
import type { StoryService } from "./modules/digest/story.service.js";
import { registerDigestRoutes } from "./modules/digest/digest.routes.js";
import type { MarketService } from "./modules/market/market.service.js";
import { registerMarketRoutes } from "./modules/market/market.routes.js";
import type { PartnerRepository } from "./modules/partner/partner.repository.js";
import type { PartnerService } from "./modules/partner/partner.service.js";
import { registerPartnerRoutes } from "./modules/partner/partner.routes.js";
import type { WatchlistService } from "./modules/watchlist/watchlist.service.js";
import { registerWatchlistRoutes } from "./modules/watchlist/watchlist.routes.js";
import type { SpeechSynthesizer } from "./providers/speech/index.js";

/** Everything the HTTP layer needs, already constructed. Built in main.ts; faked in tests. */
export interface AppDeps {
  env: Env;
  log: Logger;
  tokens: TokenService;
  partnerRepo: PartnerRepository;
  auth: AuthService;
  market: MarketService;
  watchlists: WatchlistService;
  digests: DigestService;
  story: StoryService;
  partner: PartnerService;
  speech: SpeechSynthesizer;
}

export async function buildApp(deps: AppDeps): Promise<App> {
  const app = Fastify({
    // pino's Logger is structurally a FastifyBaseLogger; the cast only reconciles generics.
    loggerInstance: deps.log as unknown as FastifyBaseLogger,
    trustProxy: true,
    disableRequestLogging: deps.env.NODE_ENV !== "development",
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: deps.env.CORS_ORIGINS.split(",").map((o) => o.trim()),
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });
  await app.register(cookie);
  await app.register(rateLimit, { global: true, max: 300, timeWindow: "1 minute" });
  await registerOpenApi(app);

  // One hook resolves the caller; routes then demand what they need.
  app.addHook("onRequest", createAuthenticate({ tokens: deps.tokens, partners: deps.partnerRepo }));

  app.get("/health", { schema: { hide: true } }, async () => ({ ok: true, market: deps.market.status().phase }));

  registerAuthRoutes(app, deps.auth, deps.env);
  registerMarketRoutes(app, deps.market);
  registerWatchlistRoutes(app, deps.watchlists);
  registerDigestRoutes(app, { digests: deps.digests, story: deps.story, speech: deps.speech });
  registerPartnerRoutes(app, deps.partner);

  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({ error: { code: "not_found", message: "No such endpoint" } });
  });

  return app;
}
