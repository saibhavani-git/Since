import { describe, expect, it } from "vitest";
import { FixedClock } from "../clock.js";
import { MemoryStore } from "./memory.store.js";

describe("MemoryStore", () => {
  it("expires values by TTL using the injected clock", async () => {
    const clock = new FixedClock(new Date("2026-09-05T10:00:00Z"));
    const store = new MemoryStore(clock);
    await store.set("k", { a: 1 }, 60);
    expect(await store.get("k")).toEqual({ a: 1 });
    clock.set(new Date("2026-09-05T10:01:01Z"));
    expect(await store.get("k")).toBeNull();
  });

  it("evicts least recently used entries when over the byte budget", async () => {
    const store = new MemoryStore(new FixedClock(new Date()), 40);
    await store.set("a", "xxxxxxxxxx", 60); // 12 bytes as JSON
    await store.set("b", "xxxxxxxxxx", 60);
    await store.get("a"); // touch a → b is now the oldest
    await store.set("c", "xxxxxxxxxxxxxxxxxxxx", 60); // pushes over budget
    expect(await store.get("b")).toBeNull();
    expect(await store.get("a")).not.toBeNull();
    expect(await store.get("c")).not.toBeNull();
  });

  it("increments atomically with a TTL on first write", async () => {
    const clock = new FixedClock(new Date("2026-09-05T10:00:00Z"));
    const store = new MemoryStore(clock);
    expect(await store.increment("n", 10)).toBe(1);
    expect(await store.increment("n", 10)).toBe(2);
    clock.set(new Date("2026-09-05T10:00:11Z"));
    expect(await store.increment("n", 10)).toBe(1);
  });

  it("round-trips bytes", async () => {
    const store = new MemoryStore(new FixedClock(new Date()));
    await store.setBytes("audio", new Uint8Array([1, 2, 3]), 60);
    expect(Array.from((await store.getBytes("audio"))!)).toEqual([1, 2, 3]);
  });
});
