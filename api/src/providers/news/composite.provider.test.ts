import { describe, expect, it } from "vitest";
import { createLogger } from "../../lib/logger.js";
import { CompositeNewsProvider } from "./composite.provider.js";
import type { EvidenceItem, NewsProvider } from "./ports.js";

const log = createLogger({ LOG_LEVEL: "silent", NODE_ENV: "test" } as never);

const item = (over: Partial<EvidenceItem>): EvidenceItem => ({
  id: "x",
  kind: "news",
  title: "Title",
  summary: null,
  url: "https://example.com",
  source: "Paper",
  publishedAt: new Date("2026-09-01T00:00:00Z"),
  sourceUrl: null,
  sentiment: null,
  category: null,
  language: "en",
  salience: 0.5,
  ...over,
});

const source = (name: string, items: EvidenceItem[] | Error): NewsProvider => ({
  name,
  enabled: true,
  search: async () => {
    if (items instanceof Error) throw items;
    return { items, partial: false };
  },
});

const q = { symbol: "TCS", name: "TCS", bseCode: null, from: new Date(0), to: new Date(), limit: 10 };

describe("CompositeNewsProvider", () => {
  it("merges sources, ranks salient filings first, then by recency", async () => {
    const composite = new CompositeNewsProvider(
      [
        source("news", [
          item({ id: "n-old", title: "Older story", publishedAt: new Date("2026-08-28T00:00:00Z"), salience: 0.6 }),
          item({ id: "n-new", title: "Newer story", publishedAt: new Date("2026-09-02T00:00:00Z"), salience: 0.6 }),
        ]),
        source("filings", [
          item({ id: "f-result", kind: "filing", title: "Results", salience: 0.9 }),
          item({ id: "f-boiler", kind: "filing", title: "Intimation under Reg 30", salience: 0.2 }),
        ]),
      ],
      log,
    );
    const ids = (await composite.search(q)).items.map((i) => i.id);
    expect(ids).toEqual(["f-result", "n-new", "n-old", "f-boiler"]);
  });

  it("survives one source failing", async () => {
    const composite = new CompositeNewsProvider([source("bad", new Error("boom")), source("good", [item({ id: "ok" })])], log);
    const result = await composite.search(q);
    expect(result.items.map((i) => i.id)).toEqual(["ok"]);
    expect(result.partial).toBe(true);
  });

  it("collapses near-duplicate titles", async () => {
    const composite = new CompositeNewsProvider(
      [source("a", [item({ id: "1", title: "TCS wins $1bn deal with Nokia" })]), source("b", [item({ id: "2", title: "TCS wins $1bn deal with Nokia!" })])],
      log,
    );
    expect((await composite.search(q)).items).toHaveLength(1);
  });

  it("is disabled when no source is", async () => {
    const composite = new CompositeNewsProvider([{ name: "off", enabled: false, search: async () => ({ items: [], partial: false }) }], log);
    expect(composite.enabled).toBe(false);
    expect(composite.name).toBe("none");
  });
});
