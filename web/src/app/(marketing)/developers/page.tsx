import type { Metadata } from "next";
import { SiteFooter, SiteNav } from "@/features/marketing/site-nav";
import { API_URL } from "@/lib/api/client";

export const metadata: Metadata = { title: "For developers" };

const endpoints: { method: string; path: string; what: string }[] = [
  { method: "PUT", path: "/v1/partner/users/{externalId}", what: "Create or update a user under your key. Attach your own labels — CRM id, segment — as metadata; we store them verbatim and echo them back." },
  { method: "PUT", path: "/v1/partner/users/{externalId}/watchlist", what: "Replace the user's watchlist: symbols with optional theses. Up to 100." },
  { method: "GET", path: "/v1/partner/users/{externalId}/digest", what: "What changed since the checkpoint — or since `?since=` — ranked, explained, cited, with a spoken script." },
  { method: "POST", path: "/v1/partner/users/{externalId}/digest/seen", what: "Move the checkpoint to now. Call when the user has seen the digest." },
  { method: "POST", path: "/v1/speech", what: "One script segment in, audio/mpeg out. Cached by text." },
];

export default function DevelopersPage() {
  return (
    <div className="bg-surface overflow-x-clip">
      <SiteNav />
      <main className="hero-glow mx-auto w-full max-w-[880px] px-5 pb-24 pt-36 sm:px-8 sm:pt-44">
        <p className="label text-text-3">For developers</p>
        <h1 className="display mt-4 text-[44px] leading-[0.98] sm:text-[64px]">
          The digest is an API. The app is its <span className="serif-accent text-text-2">first customer.</span>
        </h1>
        <p className="mt-6 max-w-[60ch] text-[17px] leading-relaxed text-text-2">
          Everything the Since web app shows comes from the same public endpoints below. Brokers and portfolio apps mirror a user&rsquo;s watchlist, ask what changed since a timestamp, and render the cards — or play the narration — inside their own product.
        </p>

        <Section title="Why this exists">
          <div className="flex flex-col gap-3">
            <p>
              Every broker and portfolio app already has a watchlist screen — a table of names and day-change percentages that
              says nothing about what happened while the user was away. Building what&rsquo;s behind Since is genuinely hard:
              ranking maths, evidence gathering, grounded writing, voice. None of it is any one app&rsquo;s core business.
            </p>
            <p>
              So the digest is the product, and we rent it out. You keep your users, your screens, and your brand; we answer one
              question behind them. Your user is a shadow account under your key, identified only by an{" "}
              <code className="rounded-[8px] bg-canvas-2 px-1.5 py-0.5 font-mono text-[13px]">externalId</code> you choose —
              Since never sees a phone number, and two partners&rsquo; users never mix.
            </p>
            <p>
              It is also how we keep ourselves honest. The web app has no private endpoints — if the API is good enough for our
              own product, it is good enough to sell.
            </p>
          </div>
        </Section>

        <Section title="Authentication">
          <div className="flex flex-col gap-3">
            <p>
              Partner requests carry a bearer key: <code className="rounded-[8px] bg-canvas-2 px-1.5 py-0.5 font-mono text-[13px]">Authorization: Bearer sk_live_…</code>. Users are identified by
              your own <code className="rounded-[8px] bg-canvas-2 px-1.5 py-0.5 font-mono text-[13px]">externalId</code>; Since never sees their phone number.
            </p>
            <p>
              Every partner gets their own key. Keys are stored as a SHA-256 hash, never in the clear, so a leaked database
              does not leak keys — the same rule we apply to refresh tokens. Everything a partner creates hangs off their key:
              the same <code className="rounded-[8px] bg-canvas-2 px-1.5 py-0.5 font-mono text-[13px]">externalId</code> under two
              different keys is two different users.
            </p>
            <p className="text-text-2">
              Being honest about where this is today: keys are issued by hand — a row we insert, seeded from the environment in
              development. That is enough for a handful of partners, and it is deliberately all we built. A real key programme
              adds self-serve issuance and rotation, per-key rate limits, and request metering so both sides can see usage and
              we can bill by it. None of that changes the API — a key is still a key; it is bookkeeping around the same header.
            </p>
          </div>
        </Section>

        <Section title="Endpoints">
          <ul className="divide-y divide-line rounded-md border border-line">
            {endpoints.map((e) => (
              <li key={e.path + e.method} className="grid gap-2 px-4 py-4 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-4">
                <span className={`font-mono text-[12px] font-medium ${e.method === "GET" ? "text-rise-strong" : e.method === "PUT" ? "text-iris-strong" : "text-text-2"}`}>{e.method}</span>
                <div className="min-w-0">
                  <code className="break-all font-mono text-[13px] text-text">{e.path}</code>
                  <p className="mt-1 text-[14px] leading-relaxed text-text-2">{e.what}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] text-text-2">
            Full schema, including the consumer endpoints the web app uses, is served live from the API as{" "}
            <a href={`${API_URL}/openapi.json`} className="font-medium text-text underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">
              OpenAPI 3.1
            </a>
            . The web app&rsquo;s TypeScript types are generated from it.
          </p>
        </Section>

        <Section title="A complete flow">
          <pre className="overflow-x-auto rounded-md bg-ink p-5 font-mono text-[13px] leading-relaxed text-text-on-ink-2">
            <code>{`# 1. Mirror the user and their list
PUT /v1/partner/users/u_8ab2
{ "name": "Asha",
  "metadata": { "crmId": "CRM-88412", "tier": "premium" } }

PUT /v1/partner/users/u_8ab2/watchlist
{ "items": [
  { "symbol": "RELIANCE", "thesis": { "kind": "target_price", "price": 3000 } },
  { "symbol": "ZOMATO",   "thesis": { "kind": "through_results" } },
  { "symbol": "HDFCBANK" }
]}

# 2. When they open your watchlist screen
GET /v1/partner/users/u_8ab2/digest
→ { "digest": { "verdict", "cards", "quiet", "script", "gap", … } }

# 3. Optional: narrate. One call per script segment.
POST /v1/speech  { "text": digest.script[0].text }
→ audio/mpeg

# 4. When they've read it
POST /v1/partner/users/u_8ab2/digest/seen`}</code>
          </pre>
        </Section>

        <Section title="How &ldquo;since you last looked&rdquo; works">
          <div className="flex flex-col gap-3">
            <p>
              Every digest answers from one instant. It is resolved in order: an explicit{" "}
              <code className="rounded-[8px] bg-canvas-2 px-1.5 py-0.5 font-mono text-[13px]">?since=</code> always wins; otherwise the
              user&rsquo;s latest <em>checkpoint</em>; with no checkpoint, the previous market close if the market is open, or the
              last seven days on a true first visit.
            </p>
            <p>
              A checkpoint is written by <code className="rounded-[8px] bg-canvas-2 px-1.5 py-0.5 font-mono text-[13px]">POST …/digest/seen</code> — the moment the user looked, plus a snapshot
              of the prices they saw. The snapshot is what lets the next digest say &ldquo;from ₹189.04&rdquo; and mean the exact
              number that was on their screen, even if the candle data has since been revised.
            </p>
            <p>
              The subtle part is what counts as &ldquo;last looked&rdquo;. Views are recorded automatically, so it must mean{" "}
              <em>the previous sitting</em> — never &ldquo;thirty seconds ago when the page loaded&rdquo;. Two rules give it that
              meaning. On read, checkpoints younger than 45 minutes are ignored, so refreshing mid-visit answers from the same
              instant instead of blanking the page. On write, views less than 15 minutes apart slide the same checkpoint forward
              rather than piling up rows.
            </p>
            <p>
              The practical consequence: call <code className="rounded-[8px] bg-canvas-2 px-1.5 py-0.5 font-mono text-[13px]">seen</code> freely — it never changes what the current
              visit shows. Come back within 45 minutes and you are still in the same sitting, reading from the same instant.
              Come back later and the digest starts where the last sitting ended. If you want different semantics — a button
              instead of a timer, a fixed daily digest — pass <code className="rounded-[8px] bg-canvas-2 px-1.5 py-0.5 font-mono text-[13px]">?since=</code> and keep the checkpoint out of it.
            </p>
          </div>
        </Section>

        <Section title="What a card contains">
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["headline", "One plain sentence that says what happened."],
              ["move", "totalPct split into marketPct and stockPct, with beta and the index used."],
              ["why + sources", "A grounded sentence with [n] citations into filings and news. null when nothing explains it."],
              ["signals", "Why this ranked: your condition triggered (tier 1), a scheduled event (2), a market event (3), or an unusual move (4)."],
              ["series + sinceIndex", "Closing prices around the gap so you can draw the same chart."],
              ["chips", "Short labels with a tone — render them however your design system likes."],
            ].map(([k, v]) => (
              <li key={k} className="rounded-md border border-line p-4">
                <code className="font-mono text-[12px] text-iris-strong">{k}</code>
                <p className="mt-1.5 text-[14px] leading-relaxed text-text-2">{v}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Guarantees">
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-text-2">
            <li>Every number in prose exists in the facts we computed; every citation points to a listed source. Output that fails this check is replaced with a template, never shown.</li>
            <li>Digests are cached and pre-warmed for watched symbols; p50 for a warm digest is tens of milliseconds.</li>
            <li>Stocks we could not price are listed under <code className="font-mono text-[13px]">unavailable</code>, never silently dropped.</li>
            <li>Data is delayed and for information only. Since does not place orders or give advice, and neither should your integration on its behalf.</li>
          </ul>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="label text-text-3">{title}</h2>
      <div className="mt-4 text-[15px] leading-relaxed text-text">{children}</div>
    </section>
  );
}
