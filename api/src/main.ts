import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { connectDatabase } from "./db/client.js";
import { seed } from "./db/seed.js";
import { createStore } from "./lib/cache/index.js";
import { SystemClock } from "./lib/clock.js";
import { createLogger } from "./lib/logger.js";
import { AuthRepository } from "./modules/auth/auth.repository.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { TokenService } from "./modules/auth/tokens.js";
import { DigestService } from "./modules/digest/digest.service.js";
import { createStoryWriter } from "./modules/digest/story/index.js";
import { StoryService } from "./modules/digest/story.service.js";
import { basePriceMap } from "./modules/market/instruments.js";
import { MarketRepository } from "./modules/market/market.repository.js";
import { MarketService } from "./modules/market/market.service.js";
import { PartnerRepository } from "./modules/partner/partner.repository.js";
import { PartnerService } from "./modules/partner/partner.service.js";
import { WatchlistRepository } from "./modules/watchlist/watchlist.repository.js";
import { WatchlistService } from "./modules/watchlist/watchlist.service.js";
import { createLanguageModel } from "./providers/ai/index.js";
import { createMarketDataProvider, YahooInstrumentSearch } from "./providers/market-data/index.js";
import { createNewsProvider } from "./providers/news/index.js";
import { createOtpSender } from "./providers/otp/index.js";
import { createPasswordHasher } from "./providers/password/index.js";
import { createSpeechSynthesizer } from "./providers/speech/index.js";

/**
 * Composition root. The only file that knows about every concrete class.
 * Read top to bottom: infrastructure → providers → repositories → services → HTTP.
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const log = createLogger(env);
  const clock = new SystemClock();

  // Infrastructure.
  const database = await connectDatabase(env);
  await database.migrate();
  await seed(database.db, env, log);
  const { db } = database;
  const store = createStore(env, clock, log);

  // Providers: everything external and swappable.
  const otp = createOtpSender(env, log);
  const hasher = createPasswordHasher();
  const marketData = createMarketDataProvider({ env, db, store, clock, log, basePrices: basePriceMap() });
  const news = createNewsProvider(env, store, clock, log);
  const model = createLanguageModel(env);
  const speech = createSpeechSynthesizer(env, store, log);

  // Repositories: SQL only.
  const authRepo = new AuthRepository(db);
  const marketRepo = new MarketRepository(db);
  const watchlistRepo = new WatchlistRepository(db);
  const partnerRepo = new PartnerRepository(db);

  // Services: use cases.
  const tokens = new TokenService(env, clock);
  const market = new MarketService(marketRepo, marketData, clock, env.MARKET_DATA_PROVIDER === "yahoo" ? new YahooInstrumentSearch(store) : null);
  const watchlists = new WatchlistService(watchlistRepo, market, clock);
  const auth = new AuthService({ env, clock, repo: authRepo, tokens, hasher, otp, watchlists });
  const story = new StoryService({ news, writer: createStoryWriter(model, log), market, store, clock, log, storyTtlSeconds: env.STORY_CACHE_TTL_SECONDS });
  const digests = new DigestService({ watchlists, watchlistRepo, market, story, clock, log });
  const partner = new PartnerService({ partners: partnerRepo, users: authRepo, watchlistRepo, market, digests });

  const app = await buildApp({ env, log, tokens, partnerRepo, auth, market, watchlists, digests, story, partner, speech });

  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, "shutting down");
    await app.close();
    await store.close();
    await database.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port: env.PORT, host: env.HOST });
  log.info(
    {
      port: env.PORT,
      db: env.DATABASE_URL ? "postgres" : `pglite:${env.PGLITE_DIR}`,
      cache: store.name,
      marketData: marketData.name,
      news: news.name,
      writer: model.enabled ? `model:${model.name}` : "template",
      otp: otp.name,
      speech: speech.name,
    },
    "since api ready",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
