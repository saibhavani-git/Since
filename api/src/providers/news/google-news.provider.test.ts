import { describe, expect, it } from "vitest";
import { GoogleNewsRssProvider, parseRss } from "./google-news.provider.js";

const feed = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>x</title>
<item><title>Jio IPO gets Sebi nod; here&#39;s how Reliance Industries shares reacted - Fortune India</title><link>https://news.google.com/rss/articles/A?oc=5</link><guid isPermaLink="false">A</guid><pubDate>Mon, 31 Aug 2026 07:48:04 GMT</pubDate><description>&lt;a href="x"&gt;y&lt;/a&gt;</description><source url="https://www.fortuneindia.com">Fortune India</source></item>
<item><title>Reliance Corporate Park was filled with Pookkalams - Facebook</title><link>https://news.google.com/rss/articles/B?oc=5</link><guid isPermaLink="false">B</guid><pubDate>Wed, 26 Aug 2026 06:30:29 GMT</pubDate><source url="https://www.facebook.com">facebook.com</source></item>
<item><title>Top 10 stocks to buy today: Reliance, TCS &amp; more - Mint</title><link>https://news.google.com/rss/articles/C?oc=5</link><guid isPermaLink="false">C</guid><pubDate>Tue, 01 Sep 2026 03:00:00 GMT</pubDate><source url="https://www.livemint.com">Mint</source></item>
<item><title>Reliance shares rise after Jefferies sees 53% upside - CNBC TV18</title><link>https://news.google.com/rss/articles/D?oc=5</link><guid isPermaLink="false">D</guid><pubDate>Tue, 10 Aug 2026 07:25:10 GMT</pubDate><source url="https://www.cnbctv18.com">CNBC TV18</source></item>
</channel></rss>`;

const provider = new GoogleNewsRssProvider(async () => new Response(feed, { status: 200 }));
const query = { symbol: "RELIANCE", name: "Reliance Industries Limited", bseCode: null, from: new Date("2026-08-25T00:00:00Z"), to: new Date("2026-09-05T00:00:00Z"), limit: 10 };

describe("GoogleNewsRssProvider", () => {
  it("parses items, strips the publisher suffix and decodes entities", () => {
    const items = parseRss(feed);
    expect(items).toHaveLength(4);
    expect(items[0]?.source).toBe("Fortune India");
    expect(items[0]?.sourceUrl).toBe("https://www.fortuneindia.com");
  });

  it("keeps real coverage, drops social posts, listicles score low, and the window is honoured", async () => {
    const { items } = await provider.search(query);
    const ids = items.map((i) => i.id);
    expect(ids).toContain("gnews:A");
    expect(ids).not.toContain("gnews:B"); // facebook
    expect(ids).not.toContain("gnews:D"); // before `from`
    const jio = items.find((i) => i.id === "gnews:A")!;
    expect(jio.title).toBe("Jio IPO gets Sebi nod; here's how Reliance Industries shares reacted");
    expect(jio.salience).toBeGreaterThanOrEqual(0.8);
    expect(items.find((i) => i.id === "gnews:C")?.salience).toBe(0.3);
  });
});
