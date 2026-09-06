import { sql } from "drizzle-orm";
import type { Db } from "./client.js";
import { instruments, partners } from "./schema.js";
import { INSTRUMENT_UNIVERSE } from "../modules/market/instruments.js";
import { sha256 } from "../lib/ids.js";
import type { Env } from "../config/env.js";
import type { Logger } from "../lib/logger.js";

/**
 * Idempotent reference data: the instrument universe and, outside
 * production, one partner API key so the developer demo works immediately.
 * Runs at every boot; `ON CONFLICT` keeps it cheap.
 */
export async function seed(db: Db, env: Env, log: Logger): Promise<void> {
  await db
    .insert(instruments)
    .values(
      INSTRUMENT_UNIVERSE.map((i) => ({
        symbol: i.symbol,
        name: i.name,
        exchange: "NSE",
        sector: i.sector,
        basePrice: i.basePrice,
      })),
    )
    .onConflictDoUpdate({
      target: instruments.symbol,
      set: { name: sql`excluded.name`, sector: sql`excluded.sector`, basePrice: sql`excluded.base_price` },
    });

  if (env.NODE_ENV !== "production") {
    await db
      .insert(partners)
      .values({ name: "Groww (demo)", keyHash: sha256(env.PARTNER_DEV_API_KEY) })
      .onConflictDoNothing({ target: partners.keyHash });
    log.info({ apiKey: env.PARTNER_DEV_API_KEY }, "seeded demo partner key");
  }

  log.info({ instruments: INSTRUMENT_UNIVERSE.length }, "seed complete");
}

/* Allow `pnpm db:seed` to run standalone. */
if (process.argv[1]?.endsWith("seed.ts")) {
  const [{ loadEnv }, { connectDatabase }, { createLogger }] = await Promise.all([
    import("../config/env.js"),
    import("./client.js"),
    import("../lib/logger.js"),
  ]);
  const env = loadEnv();
  const log = createLogger(env);
  const database = await connectDatabase(env);
  await database.migrate();
  await seed(database.db, env, log);
  await database.close();
}
