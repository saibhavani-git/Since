/**
 * Collapse concurrent calls for the same key into one in‑flight promise.
 * The L0 cache tier: a thundering herd for `RELIANCE` at 9:15 becomes
 * one upstream call per process.
 */
export class SingleFlight {
  private readonly inflight = new Map<string, Promise<unknown>>();

  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;
    const p = fn().finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }
}
