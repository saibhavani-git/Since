import type { Env } from "../../config/env.js";
import type { Clock } from "../clock.js";
import type { Logger } from "../logger.js";
import { MemoryStore } from "./memory.store.js";
import type { KeyValueStore } from "./ports.js";
import { RedisStore } from "./redis.store.js";

export type { KeyValueStore } from "./ports.js";
export { MemoryStore } from "./memory.store.js";
export { RedisStore } from "./redis.store.js";

/** Redis when configured, memory otherwise. Tests and demos never need Redis. */
export function createStore(env: Env, clock: Clock, log: Logger): KeyValueStore {
  if (env.REDIS_URL) return new RedisStore(env.REDIS_URL, log);
  log.info("REDIS_URL not set; using in‑process cache (single instance only)");
  return new MemoryStore(clock);
}
