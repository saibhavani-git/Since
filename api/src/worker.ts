import { Queue, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import { loadEnv } from "./config/env.js";
import { connectDatabase } from "./db/client.js";
import { createStore } from "./lib/cache/index.js";
import { SystemClock } from "./lib/clock.js";
import { createLogger } from "./lib/logger.js";
import { basePriceMap } from "./modules/market/instruments.js";
import { MarketRepository } from "./modules/market/market.repository.js";
import { MarketService } from "./modules/market/market.service.js";
import { PrewarmService } from "./modules/prewarm/prewarm.service.js";
import { createMarketDataProvider } from "./providers/market-data/index.js";
import { createNewsProvider } from "./providers/news/index.js";

/**
 * The background process. Repeatable jobs keep the shared cache
 * warm; the API only reads. Same providers as the API, same cache keys,
 * so whatever the worker fetched, the API finds.
 */
const QUEUE = "since-warm";

const JOBS = {
  quotes: { every: 20_000 },
  history: { pattern: "45 15 * * 1-5", tz: "Asia/Kolkata" }, // 15:45 IST, after the close
  evidence: { every: 10 * 60_000 },
} as const;

async function main(): Promise<void> {
  const env = loadEnv();
  const log = createLogger(env).child({ proc: "worker" });
  if (!env.REDIS_URL) {
    log.error("REDIS_URL is required for the worker");
    process.exit(1);
  }
  const clock = new SystemClock();
  const database = await connectDatabase(env);
  const { db } = database;
  const store = createStore(env, clock, log);
  const marketData = createMarketDataProvider({ env, db, store, clock, log, basePrices: basePriceMap() });
  const market = new MarketService(new MarketRepository(db), marketData, clock);
  const news = createNewsProvider(env, store, clock, log);
  const prewarm = new PrewarmService({ db, market, news, clock, log });

  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue(QUEUE, { connection, prefix: "since:bull" });

  // Idempotent scheduling: BullMQ upserts by scheduler id. Schedulers this
  // version no longer defines are removed, so stale entries from an older
  // worker can't keep enqueuing jobs nobody handles.
  for (const s of await queue.getJobSchedulers()) {
    if (!(s.key in JOBS)) await queue.removeJobScheduler(s.key);
  }
  await queue.upsertJobScheduler("quotes", { every: JOBS.quotes.every }, { name: "quotes" });
  await queue.upsertJobScheduler("history", { pattern: JOBS.history.pattern, tz: JOBS.history.tz }, { name: "history" });
  await queue.upsertJobScheduler("evidence", { every: JOBS.evidence.every }, { name: "evidence" });
  // Warm once at boot so a fresh deploy is fast immediately.
  await queue.add("history", {}, { jobId: `boot-history-${Date.now()}` });

  const worker = new Worker(
    QUEUE,
    async (job: Job) => {
      switch (job.name) {
        case "quotes":
          return prewarm.quotes();
        case "history":
          return prewarm.history();
        case "evidence":
          return prewarm.evidence();
        default:
          throw new Error(`unknown job ${job.name}`);
      }
    },
    { connection, concurrency: 2, prefix: "since:bull" },
  );

  worker.on("completed", (job, result) => log.info({ job: job.name, result, ms: Date.now() - job.processedOn! }, "job done"));
  worker.on("failed", (job, err) => log.error({ job: job?.name, err: err.message }, "job failed"));

  const shutdown = async (): Promise<void> => {
    await worker.close();
    await queue.close();
    await connection.quit();
    await store.close();
    await database.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  log.info({ queue: QUEUE, jobs: Object.keys(JOBS), marketData: marketData.name, news: news.name }, "since worker ready");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
