import { describe, expect, it } from "vitest";
import { BseFilingsProvider } from "./bse-filings.provider.js";

const row = (over: Record<string, unknown>) => ({
  NEWSID: "n1",
  SCRIP_CD: 500180,
  NEWSSUB: "Intimation Under Regulation 30 Of The SEBI (Listing Obligations And Disclosure Requirements) Regulations, 2015",
  HEADLINE: "Exercise of call option on INR 7,39,00,00,000 Additional Tier 1 notes issued by the Bank",
  ATTACHMENTNAME: "abc.pdf",
  NEWS_DT: "2026-09-01T21:17:43.147",
  CATEGORYNAME: "Company Update",
  SUBCATNAME: "General",
  SLONGNAME: "HDFC Bank Ltd",
  NSURL: null,
  ...over,
});

const providerWith = (rows: unknown[]) =>
  new BseFilingsProvider(async () => new Response(JSON.stringify({ Table: rows }), { status: 200 }));

const query = { symbol: "HDFCBANK", name: "HDFC Bank", bseCode: "500180", from: new Date("2026-08-25T00:00:00Z"), to: new Date("2026-09-05T00:00:00Z"), limit: 10 };

describe("BseFilingsProvider", () => {
  it("returns nothing without a scrip code and never calls upstream", async () => {
    let called = false;
    const p = new BseFilingsProvider(async () => {
      called = true;
      return new Response("{}");
    });
    expect((await p.search({ ...query, bseCode: null })).items).toEqual([]);
    expect(called).toBe(false);
  });

  it("prefers the informative field as title and treats the timestamp as IST", async () => {
    const [item] = (await providerWith([row({})]).search(query)).items;
    expect(item?.title).toMatch(/^Exercise of call option/);
    expect(item?.summary).toMatch(/^Intimation Under Regulation 30/);
    expect(item?.publishedAt.toISOString()).toBe("2026-09-01T15:47:43.147Z");
    expect(item?.url).toBe("https://www.bseindia.com/xml-data/corpfiling/AttachLive/abc.pdf");
    expect(item?.kind).toBe("filing");
  });

  it("drops compliance noise by title or category", async () => {
    const { items } = await providerWith([
      row({ NEWSID: "a", HEADLINE: "Allotment of 30,58,164 equity shares pursuant to exercise of ESOP/RSU", SUBCATNAME: "Allotment of ESOP / ESPS" }),
      row({ NEWSID: "b", HEADLINE: "Closure of Trading Window", SUBCATNAME: "General" }),
      row({ NEWSID: "c", HEADLINE: "Outcome of Board Meeting - Q2 results", SUBCATNAME: "Result" }),
    ]).search(query);
    expect(items.map((i) => i.id)).toEqual(["bse:c"]);
  });

  it("scores results and deals high, boilerplate low", async () => {
    const { items } = await providerWith([
      row({ NEWSID: "r", HEADLINE: "Outcome of Board Meeting - Q2 results", SUBCATNAME: "Result" }),
      row({ NEWSID: "b", HEADLINE: "Intimation under Regulation 30 of SEBI (Listing Obligations and Disclosure Requirements) Regulations, 2015", NEWSSUB: "Intimation under Regulation 30 of SEBI (Listing Obligations and Disclosure Requirements) Regulations, 2015" }),
    ]).search(query);
    const bySym = Object.fromEntries(items.map((i) => [i.id, i.salience]));
    expect(bySym["bse:r"]).toBeGreaterThanOrEqual(0.9);
    expect(bySym["bse:b"]).toBeLessThanOrEqual(0.2);
  });

  it("excludes filings outside the window", async () => {
    const { items } = await providerWith([row({ NEWS_DT: "2026-08-01T10:00:00" })]).search(query);
    expect(items).toEqual([]);
  });
});
