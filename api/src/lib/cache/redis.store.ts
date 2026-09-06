import { Redis } from "ioredis";
import type { Logger } from "../logger.js";
import type { KeyValueStore } from "./ports.js";

/**
 * Redis‑backed store shared by every API instance and the worker.
 * Every method degrades to a miss (never a throw) if Redis is unreachable —
 * a cache outage must slow the product down, not take it down.
 */
export class RedisStore implements KeyValueStore {
  readonly name = "redis";
  private readonly redis: Redis;

  constructor(
    url: string,
    private readonly log: Logger,
    private readonly prefix = "since:",
  ) {
    this.redis = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 200, 5_000),
    });
    this.redis.on("error", (err) => this.log.warn({ err: err.message }, "redis error"));
  }

  async get<T>(key: string): Promise<T | null> {
    return this.guard(async () => {
      const raw = await this.redis.get(this.prefix + key);
      return raw == null ? null : (JSON.parse(raw) as T);
    });
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.guard(() => this.redis.set(this.prefix + key, JSON.stringify(value), "EX", Math.max(1, Math.ceil(ttlSeconds))));
  }

  async getBytes(key: string): Promise<Uint8Array | null> {
    return this.guard(async () => {
      const buf = await this.redis.getBuffer(this.prefix + key);
      return buf ? new Uint8Array(buf) : null;
    });
  }

  async setBytes(key: string, value: Uint8Array, ttlSeconds: number): Promise<void> {
    await this.guard(() => this.redis.set(this.prefix + key, Buffer.from(value), "EX", Math.max(1, Math.ceil(ttlSeconds))));
  }

  async delete(key: string): Promise<void> {
    await this.guard(() => this.redis.del(this.prefix + key));
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const n = await this.guard(async () => {
      const k = this.prefix + key;
      const results = (await this.redis.multi().incr(k).expire(k, ttlSeconds, "NX").exec()) ?? [];
      return Number(results[0]?.[1] ?? 1);
    });
    return n ?? 1;
  }

  async ping(): Promise<boolean> {
    return (await this.guard(() => this.redis.ping())) === "PONG";
  }

  async close(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }

  private async guard<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (err) {
      this.log.warn({ err: err instanceof Error ? err.message : String(err) }, "redis unavailable; treating as miss");
      return null;
    }
  }
}
