import { createRequire } from "node:module";
import pino, { type Logger } from "pino";
import type { Env } from "../config/env.js";

export type { Logger };

export function createLogger(env: Env): Logger {
  const pretty = env.NODE_ENV === "development" && hasPinoPretty();
  return pino({
    level: env.LOG_LEVEL,
    ...(pretty
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
          },
        }
      : {}),
    redact: ["req.headers.authorization", "req.headers.cookie", "password", "*.password"],
  });
}

/** pino-pretty is a dev dependency; production images (and containers run with a dev .env) fall back to JSON lines. */
function hasPinoPretty(): boolean {
  try {
    createRequire(import.meta.url).resolve("pino-pretty");
    return true;
  } catch {
    return false;
  }
}
