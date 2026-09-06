import { describe, expect, it } from "vitest";
import type { Digest, DigestCard } from "../../../contracts/index.js";
import { createLogger } from "../../../lib/logger.js";
import type { LanguageModel } from "../../../providers/ai/index.js";
import type { EvidenceItem } from "../../../providers/news/index.js";
import { ModelStoryWriter } from "./model.writer.js";
import type { StoryFacts } from "./ports.js";
import { TemplateStoryWriter } from "./template.writer.js";

const log = createLogger({ LOG_LEVEL: "silent", NODE_ENV: "test" } as never);

const evidence = (over: Partial<EvidenceItem>): EvidenceItem => ({
  id: "bse:1",
  kind: "filing",
  title: "Outcome of board meeting: Q2 results, revenue up 8%",
  summary: null,
  url: "https://bseindia.com",
  source: "BSE filing",
  publishedAt: new Date("2026-09-01T12:00:00Z"),
  sourceUrl: null,
  sentiment: null,
  category: "Result",
  language: "en",
  salience: 0.9,
  ...over,
});

const facts = (over: Partial<StoryFacts> = {}): StoryFacts => ({
  symbol: "TCS",
  name: "Tata Consultancy Services",
  since: new Date("2026-08-28T10:00:00Z"),
  now: new Date("2026-09-05T09:00:00Z"),
  priceThen: 3400,
  priceNow: 3520.5,
  move: { totalPct: 3.54, marketPct: 1.2, stockPct: 2.34, beta: 1.05, indexSymbol: "NIFTY 50", indexPct: 1.14 },
  moveInSigmas: 1.8,
  volumeRatio: 2.1,
  signals: [{ kind: "unusual_move", tier: 4, at: null, summary: "Moved 1.8σ more than usual", data: { sigmas: 1.8 } }],
  headline: "TCS is up 3.5% since Thursday, more than its usual range.",
  evidence: [evidence({})],
  events: { nextResultsAt: null, exDividendAt: null },
  series: [
    { t: new Date("2026-08-26T10:00:00Z"), c: 3380 },
    { t: new Date("2026-08-27T10:00:00Z"), c: 3400 },
    { t: new Date("2026-09-01T10:00:00Z"), c: 3450 },
    { t: new Date("2026-09-02T10:00:00Z"), c: 3600 },
    { t: new Date("2026-09-03T10:00:00Z"), c: 3480 },
    { t: new Date("2026-09-04T10:00:00Z"), c: 3520.5 },
  ],
  sinceIndex: 1,
  ...over,
});

const model = (reply: string): LanguageModel => ({ name: "fake", enabled: true, complete: async () => reply });

describe("TemplateStoryWriter", () => {
  const writer = new TemplateStoryWriter();

  it("still says something useful without evidence: what the numbers show", async () => {
    const why = await writer.why(facts({ evidence: [] }));
    expect(why).toMatch(/^No filing or news in this window explains it\./);
    expect(why).toContain("1.8× its usual move");
    expect(why).toContain("2.1× normal volume");
    expect(why).toContain("Nifty’s +1.1%");
  });

  it("lets salient evidence read as a cause", async () => {
    expect(await writer.why(facts())).toMatch(/^The company filed “Outcome of board meeting/);
  });

  it("refuses to imply causation from a routine filing", async () => {
    const why = await writer.why(facts({ evidence: [evidence({ salience: 0.2, title: "Intimation under Regulation 30" })] }));
    expect(why).toMatch(/^No filing or news in this window explains it/);
    // Boilerplate is not even quoted — it says nothing.
    expect(why).not.toContain("Regulation 30");
  });

  it("writes a report with the expected sections", async () => {
    const report = await writer.report(facts());
    expect(report.sections.map((s) => s.title)).toEqual(["What happened", "Why"]);
    expect(report.writer).toBe("template");
  });
});

describe("ModelStoryWriter grounding", () => {
  const template = new TemplateStoryWriter();

  it("accepts prose whose numbers and citations all come from the facts", async () => {
    const writer = new ModelStoryWriter(model("TCS rose 3.54% after it reported Q2 results with revenue up 8% [1]."), template, log);
    expect(await writer.why(facts())).toMatch(/^TCS rose 3.54%/);
  });

  it("falls back to the template when the model invents a number", async () => {
    const writer = new ModelStoryWriter(model("TCS rose 12% after a ₹5,000 crore order win [1]."), template, log);
    expect(await writer.why(facts())).toMatch(/^The company filed/);
  });

  it("falls back when a citation points at evidence that does not exist", async () => {
    const writer = new ModelStoryWriter(model("TCS rose 3.54% on strong results [3]."), template, log);
    expect(await writer.why(facts())).toMatch(/^The company filed/);
  });

  it("turns NONE into the honest 'nothing explains this' line, not an empty card", async () => {
    const writer = new ModelStoryWriter(model("NONE"), template, log);
    const why = await writer.why(facts());
    expect(why).toMatch(/^No filing or news in this window explains it/);
    // A substantive filing is named as context, never as the cause.
    expect(why).toContain("The only thing on record is a filing");
    expect(await writer.why(facts({ evidence: [] }))).toMatch(/^No filing or news/);
  });

  it("uses a well-formed JSON report and marks it as model-written", async () => {
    const json = JSON.stringify({
      headline: "TCS moved 3.54% since Thursday.",
      why: "Q2 results landed [1].",
      sections: [{ title: "What happened", body: "Up 3.54%; 1.2% of that was the market." }],
    });
    const writer = new ModelStoryWriter(model(`Here you go:\n${json}`), template, log);
    const report = await writer.report(facts());
    expect(report.writer).toBe("model");
    expect(report.sections).toHaveLength(1);
  });

  it("uses the template when the model returns unparseable output", async () => {
    const writer = new ModelStoryWriter(model("I cannot do that."), template, log);
    expect((await writer.report(facts())).writer).toBe("template");
  });
});

describe("presentSources", () => {
  const ev = (id: string, salience: number, kind: "filing" | "news" = "filing") => evidence({ id, salience, kind, title: id });

  it("puts cited evidence first and renumbers markers to match", async () => {
    const { presentSources } = await import("../story.service.js");
    const items = [ev("boiler", 0.2), ev("news", 0.6, "news"), ev("deal", 0.9)];
    const out = presentSources("Because of the deal [3] and the report [2].", items, 4);
    expect(out.sources.map((s) => s.id)).toEqual(["deal", "news"]);
    expect(out.why).toBe("Because of the deal [1] and the report [2].");
  });

  it("drops routine filings from the shown list when nothing cites them", async () => {
    const { presentSources } = await import("../story.service.js");
    const out = presentSources(null, [ev("boiler", 0.2), ev("plain", 0.5)], 4);
    expect(out.sources.map((s) => s.id)).toEqual(["plain"]);
  });
});

describe("story()", () => {
  const template = new TemplateStoryWriter();
  const ev = (id: string, title: string, salience: number, at: string, kind: "filing" | "news" = "news") =>
    evidence({ id, title, salience, kind, publishedAt: new Date(at), source: "Mint", url: `https://x/${id}` });

  it("template: cleans headlines, drops boilerplate, adds price milestones, newest first", async () => {
    const f = facts({
      evidence: [
        ev("a", "TCS bags $1 bn deal from Lloyds - Mint", 0.8, "2026-09-01T06:00:00Z"),
        ev("b", "Intimation under Regulation 30", 0.2, "2026-09-02T06:00:00Z", "filing"),
        ev("c", "TCS bags $1 bn deal from Lloyds", 0.7, "2026-09-01T08:00:00Z"),
      ],
    });
    const { lead, points } = await template.story(f);
    expect(lead).toBeNull();
    const titles = points.map((p) => p.title);
    expect(titles).toContain("TCS bags $1 bn deal from Lloyds");
    expect(titles.filter((t) => t.includes("Lloyds"))).toHaveLength(1); // deduped
    expect(titles.some((t) => t.includes("Regulation 30"))).toBe(false);
    // the ₹3,600 close on 2 Sep is the high of the stretch and not where it is now
    const high = points.find((p) => p.kind === "price" && p.tone === "up");
    expect(high?.title).toContain("₹3,600");
    expect(high?.price).toBe(3600);
    expect(points[0]!.at >= points[points.length - 1]!.at).toBe(true);
  });

  it("template: points carry the close and day change of their date", async () => {
    const { points } = await template.story(facts({ evidence: [ev("a", "TCS wins deal", 0.8, "2026-09-02T09:00:00Z")] }));
    const a = points.find((p) => p.id === "a")!;
    expect(a.price).toBe(3600);
    expect(a.dayChangePct).toBeCloseTo(4.3, 1);
  });

  it("model: merges duplicates, keeps grounded points, drops ungrounded ones, lifts the lead", async () => {
    const reply = JSON.stringify({
      lead: "TCS rose 3.5% after winning a $1 bn Lloyds deal",
      points: [
        { i: [1, 3], title: "Wins a $1 bn, five-year deal with Lloyds Banking Group", detail: null, tone: "up", weight: 0.9 },
        { i: [2], title: "Announces 7% dividend hike", detail: "Board approved ₹99 per share.", tone: "up", weight: 0.5 },
      ],
    });
    const writer = new ModelStoryWriter(model(reply), template, log);
    const f = facts({
      evidence: [
        ev("a", "TCS bags $1 bn deal from Lloyds", 0.8, "2026-09-01T06:00:00Z"),
        ev("b", "TCS board meets", 0.5, "2026-09-02T06:00:00Z", "filing"),
        ev("c", "TCS wins Lloyds contract worth $1 billion", 0.7, "2026-09-01T08:00:00Z"),
      ],
    });
    const { lead, points } = await writer.story(f);
    expect(lead).toBe("TCS rose 3.5% after winning a $1 bn Lloyds deal");
    const news = points.filter((p) => p.kind !== "price");
    expect(news).toHaveLength(1); // the dividend point invented 7% and ₹99 → dropped
    expect(news[0]!.title).toBe("Wins a $1 bn, five-year deal with Lloyds Banking Group");
    expect(news[0]!.id).toBe("a");
    expect(news[0]!.source).toBe("Mint");
  });

  it("model: garbage falls back to the template list", async () => {
    const writer = new ModelStoryWriter(model("not json"), template, log);
    const { points } = await writer.story(facts());
    expect(points.length).toBeGreaterThan(0);
  });
});

describe("news-aware watchlist curation", () => {
  it("shows a normal price move when company news exists and demotes only a truly quiet stock", async () => {
    const { curateDigest } = await import("../story.service.js");
    const card = (symbol: string, withNews: boolean): DigestCard => ({
      symbol,
      instrument: { symbol, name: symbol, exchange: "NSE", sector: null },
      priceThen: 100,
      priceNow: 100,
      move: { totalPct: 0, marketPct: 0, stockPct: 0, beta: 1, indexSymbol: "^NSEI", indexPct: 0 },
      volatility: { dailySigmaPct: 1, moveInSigmas: 0 },
      volumeRatio: 1,
      headline: `${symbol} was flat`,
      why: null,
      sources: [],
      story: withNews
        ? [{ id: "n1", kind: "news", at: "2026-09-05T08:00:00Z", title: "Board approved a new project", detail: null, source: "Mint", sourceUrl: null, url: "https://x", price: 100, dayChangePct: 0, tone: "neutral", weight: 0.7 }]
        : [],
      summary: "Summary",
      narration: "Narration",
      chips: [],
      signals: [],
      score: 0,
      series: [{ t: "2026-09-04T10:00:00Z", c: 100 }, { t: "2026-09-05T10:00:00Z", c: 100 }],
      sinceIndex: 0,
    });
    const digest = {
      language: "en",
      gap: { sinceLabel: "Since yesterday", sessions: 1 },
      cards: [card("HASNEWS", true), card("QUIET", false)],
      quiet: [],
    } as unknown as Digest;

    const result = curateDigest(digest);
    expect(result.cards.map((item) => item.symbol)).toEqual(["HASNEWS"]);
    expect(result.quiet.map((item) => item.symbol)).toEqual(["QUIET"]);
    expect(result.script.some((part) => part.kind === "card" && part.symbol === "HASNEWS")).toBe(true);
  });
});
