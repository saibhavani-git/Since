import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit generates SQL migrations into ./migrations from the schema.
 * Applying them happens at boot (src/db/client.ts) so the same files run
 * against the Docker Postgres in development, PGlite in tests, and the
 * managed Postgres in production. `dbCredentials` is only for `db:studio`.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./migrations",
  strict: true,
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://since:since@localhost:5432/since" },
});
