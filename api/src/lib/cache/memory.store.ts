import type { Clock } from "../clock.js";
import type { KeyValueStore } from "./ports.js";

interface Entry {
  value: unknown;
  expiresAt: number;
  bytes: number;
}

/**
 * In‑process store with TTL and a byte budget (LRU by insertion order).
 * Not shared across instances — for tests, demos and as a no‑Redis fallback.
 */
export class MemoryStore implements KeyValueStore {
  readonly name = "memory";
  private readonly entries = new Map<string, Entry>();
  private used = 0;

  constructor(
    private readonly clock: Clock,
    private readonly maxBytes = 128 * 1024 * 1024,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const e = this.live(key);
    return e ? (e.value as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.put(key, value, ttlSeconds, JSON.stringify(value).length);
  }

  async getBytes(key: string): Promise<Uint8Array | null> {
    const e = this.live(key);
    return e ? (e.value as Uint8Array) : null;
  }

  async setBytes(key: string, value: Uint8Array, ttlSeconds: number): Promise<void> {
    this.put(key, value, ttlSeconds, value.byteLength);
  }

  async delete(key: string): Promise<void> {
    const e = this.entries.get(key);
    if (e) {
      this.used -= e.bytes;
      this.entries.delete(key);
    }
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const e = this.live(key);
    const next = ((e?.value as number | undefined) ?? 0) + 1;
    if (e) e.value = next;
    else this.put(key, next, ttlSeconds, 8);
    return next;
  }

  async close(): Promise<void> {
    this.entries.clear();
    this.used = 0;
  }

  private live(key: string): Entry | null {
    const e = this.entries.get(key);
    if (!e) return null;
    if (e.expiresAt <= this.clock.now().getTime()) {
      void this.delete(key);
      return null;
    }
    // Refresh recency.
    this.entries.delete(key);
    this.entries.set(key, e);
    return e;
  }

  private put(key: string, value: unknown, ttlSeconds: number, bytes: number): void {
    void this.delete(key);
    this.entries.set(key, { value, expiresAt: this.clock.now().getTime() + ttlSeconds * 1000, bytes });
    this.used += bytes;
    while (this.used > this.maxBytes && this.entries.size > 1) {
      const oldest = this.entries.keys().next().value as string;
      void this.delete(oldest);
    }
  }
}
