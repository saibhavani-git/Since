/**
 * Port: a shared key/value store with TTLs. Redis in deployment,
 * memory in tests and single‑laptop demos. Values are JSON or raw bytes.
 */
export interface KeyValueStore {
  readonly name: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  getBytes(key: string): Promise<Uint8Array | null>;
  setBytes(key: string, value: Uint8Array, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  /** Atomic increment with expiry on first write; for counters and rate limits. */
  increment(key: string, ttlSeconds: number): Promise<number>;
  close(): Promise<void>;
}
