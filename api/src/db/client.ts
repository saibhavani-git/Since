import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Env } from "../config/env.js";
import * as schema from "./schema.js";

/**
 * One Drizzle interface, two drivers. Callers never know which.
 */
export type Db = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

export interface Database {
  db: Db;
  migrate(): Promise<void>;
  close(): Promise<void>;
}

const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../migrations");

export async function connectDatabase(env: Env): Promise<Database> {
  if (env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });
    const db = drizzlePg(pool, { schema });
    return {
      db,
      migrate: () => migratePg(db, { migrationsFolder }),
      close: () => pool.end(),
    };
  }

  const dataDir = env.NODE_ENV === "test" ? undefined : env.PGLITE_DIR;
  if (dataDir) mkdirSync(dataDir, { recursive: true }); // PGlite won't create parents
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema });
  return {
    db,
    migrate: () => migratePglite(db, { migrationsFolder }),
    close: () => client.close(),
  };
}
