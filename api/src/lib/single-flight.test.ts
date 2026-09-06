import { describe, expect, it } from "vitest";
import { SingleFlight } from "./single-flight.js";

describe("SingleFlight", () => {
  it("collapses concurrent calls for one key into a single execution", async () => {
    const flight = new SingleFlight();
    let calls = 0;
    const slow = () => new Promise<number>((resolve) => setTimeout(() => resolve(++calls), 10));
    const results = await Promise.all([flight.run("k", slow), flight.run("k", slow), flight.run("k", slow)]);
    expect(results).toEqual([1, 1, 1]);
    expect(calls).toBe(1);
  });

  it("runs again once the previous flight has settled", async () => {
    const flight = new SingleFlight();
    let calls = 0;
    await flight.run("k", async () => ++calls);
    await flight.run("k", async () => ++calls);
    expect(calls).toBe(2);
  });

  it("propagates failures to every waiter and clears the slot", async () => {
    const flight = new SingleFlight();
    const failing = () => Promise.reject(new Error("upstream"));
    await expect(Promise.all([flight.run("k", failing), flight.run("k", failing)])).rejects.toThrow("upstream");
    await expect(flight.run("k", async () => "ok")).resolves.toBe("ok");
  });
});
