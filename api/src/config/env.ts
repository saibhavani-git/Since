import { z } from "zod";

/**
 * Environment is validated once at boot. A misconfigured deployment fails
 * loudly here rather than as a mysterious 500 later.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  /** Postgres (Docker in dev via `pnpm db:up`). Empty → embedded PGlite; tests rely on this. */
  DATABASE_URL: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  PGLITE_DIR: z.string().default(".data/pglite"),
  /** Shared cache + job queue. Empty → in‑process cache, no worker. */
  REDIS_URL: z.string().url().optional().or(z.literal("").transform(() => undefined)),

  /** Comma‑separated browser origins allowed to send cookies. */
  CORS_ORIGINS: z.string().default("http://localhost:3001"),

  JWT_SECRET: z.string().min(32).default("since-dev-only-secret-change-me-in-production-please"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 2),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 30),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // ---- providers: each value is resolved in src/providers/<name>/index.ts ----

  OTP_SENDER: z.enum(["dev_fixed", "console", "msg91"]).default("dev_fixed"),
  OTP_DEV_CODE: z.string().regex(/^\d{6}$/).default("246810"),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 10),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),

  MARKET_DATA_PROVIDER: z.enum(["yahoo", "fixture"]).default("yahoo"),
  QUOTE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  CANDLE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 30),

  /** Language model that writes the "why" and the report from our facts. `none` keeps templates. */
  AI_PROVIDER: z.enum(["none", "openai", "anthropic", "sarvam"]).default("none"),
  AI_MODEL: z.string().optional(),
  AI_API_KEY: z.string().optional(),

  /** Vendor‑native key names, honoured as fallbacks for AI_API_KEY / SPEECH_API_KEY. */
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  SARVAM_API_KEY: z.string().optional(),
  CARTESIA_API_KEY: z.string().optional(),

  /** Evidence for "why": BSE filings + Google News RSS, both free and keyless. */
  NEWS_PROVIDER: z.enum(["live", "fixture", "none"]).default("live"),
  /** Google News RSS (India edition): free, keyless, and where most Indian business coverage lives. */
  NEWS_GOOGLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  FILINGS_BSE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  EVIDENCE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 30),
  STORY_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60),

  /** Text‑to‑speech for the narrated catch‑up. `none` → the app reads silently. */
  SPEECH_PROVIDER: z.enum(["none", "cartesia", "sarvam"]).default("none"),
  SPEECH_API_KEY: z.string().optional(),
  /** Cartesia voice id, or Sarvam speaker name (e.g. `shubh`). */
  SPEECH_VOICE_ID: z.string().optional(),
  SPEECH_MODEL: z.string().optional(),

  PARTNER_DEV_API_KEY: z.string().min(16).default("sk_dev_groww_since_demo_key"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === "production" && env.JWT_SECRET.startsWith("since-dev-only")) {
    throw new Error("JWT_SECRET must be set in production");
  }
  return env;
}
