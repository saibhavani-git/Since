import type { Metadata } from "next";
import { Reveal } from "@/features/marketing/reveal";
import { SiteFooter, SiteNav } from "@/features/marketing/site-nav";
import { cx } from "@/lib/cx";

export const metadata: Metadata = { title: "Architecture" };

/**
 * The system, explained the way we would on a whiteboard: the diagram first,
 * then what each box is and why it is that box — including the places where
 * a different choice becomes right at a different scale.
 */
export default function ArchitecturePage() {
  return (
    <div className="bg-surface overflow-x-clip">
      <SiteNav />
      <main className="hero-glow mx-auto w-full max-w-[980px] px-5 pb-24 pt-36 sm:px-8 sm:pt-44">
        <p className="label text-text-3">Architecture</p>
        <h1 className="display mt-4 text-[44px] leading-[0.98] sm:text-[60px]">
          One question, answered by <span className="serif-accent text-text-2">five layers.</span>
        </h1>
        <p className="mt-6 max-w-[60ch] text-[17px] leading-relaxed text-text-2">
          Everything here exists to answer &ldquo;what changed since you last looked?&rdquo; in under two seconds. The app is thin.
          The engine is pure. Everything expensive is cached per stock, not per user — so a million people watching Reliance cost
          the same as one.
        </p>

        {/* ------------------------------------------------------------------ */}
        {/* The diagram                                                         */}
        {/* ------------------------------------------------------------------ */}
        <Reveal className="mt-16">
          <Diagram />
        </Reveal>

        {/* ------------------------------------------------------------------ */}
        {/* The core definition                                                 */}
        {/* ------------------------------------------------------------------ */}
        <section className="mt-20">
          <h2 className="label text-text-3">What counts as a meaningful change</h2>
          <div className="mt-4 flex max-w-[68ch] flex-col gap-3 text-[15px] leading-relaxed text-text-2">
            <p>
              The hardest question in this product hides in one word: what changed <em>meaningfully</em>. Our answer has two
              halves — how big was the move, really, and did anything happen that you specifically said you care about.
            </p>
            <p>
              Size first, and never in raw percent. Every move is split into the market&rsquo;s part and the stock&rsquo;s own
              part — a beta against the Nifty, estimated from a year of daily returns — because &ldquo;up 3%&rdquo; means nothing
              on a day the whole market rose 3%. What remains is measured against that stock&rsquo;s own residual volatility,
              scaled to the length of your gap. A 2% week is loud for HDFC Bank and silence for a small-cap; σ knows the
              difference where percent doesn&rsquo;t.
            </p>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { tier: "Tier 1", tint: "bg-tile-lavender", name: "You said it matters", what: "Your thesis triggered: the target price was hit, the breakout level broke, the results you were holding through landed." },
              { tier: "Tier 2", tint: "bg-tile-gold", name: "The calendar says it matters", what: "Results or an ex-dividend date inside the window ahead — the things you'd be annoyed to have missed." },
              { tier: "Tier 3", tint: "bg-tile-sky", name: "The market marked it", what: "A 52-week high or low, your buy price crossed, a big round number taken out, volume running far above normal." },
              { tier: "Tier 4", tint: "bg-tile-slate", name: "The statistics flag it", what: "A move outside the stock's usual range, or a sharp gap at the open — unusual even after the market's part is removed." },
            ].map((t) => (
              <li key={t.tier} className="rounded-[24px] border border-line bg-surface p-6">
                <span className={cx("inline-flex h-7 items-center rounded-full px-3 text-[11px] font-bold uppercase tracking-[0.07em] text-ink", t.tint)}>
                  {t.tier}
                </span>
                <p className="display mt-3 text-[19px]">{t.name}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-text-2">{t.what}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex max-w-[68ch] flex-col gap-3 text-[15px] leading-relaxed text-text-2">
            <p>
              Tier dominates by construction: no amount of σ turns a round number into your thesis. Corroboration adds a little —
              a big move <em>with</em> a volume spike outranks the move alone — and anything that clears no bar at all is filed
              under quiet: shown, never shouting. The verdict at the top of the catch-up is set the same way — it only says
              &ldquo;triggered&rdquo; when a tier-1 signal exists.
            </p>
            <p>
              When data disagrees, precedence is explicit. Exchange filings outrank press coverage; near-duplicate headlines
              collapse into one; the writer may only restate facts we computed, and a draft containing anything else is thrown
              away. Prices are 15 minutes delayed and say so — every response carries its own freshness — and a stock we could
              not price appears under <code className="rounded-[8px] bg-canvas-2 px-1.5 py-0.5 font-mono text-[13px]">unavailable</code> rather
              than vanishing. When nothing explains a move, the card says exactly that.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* The pieces                                                          */}
        {/* ------------------------------------------------------------------ */}
        <section className="mt-20">
          <h2 className="label text-text-3">The pieces, and why</h2>
          <div className="mt-6 flex flex-col divide-y divide-line border-y border-line">
            {PIECES.map((p) => (
              <Reveal key={p.name} className="grid gap-2 py-7 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-8">
                <div>
                  <span className={cx("inline-flex h-7 items-center rounded-full px-3 text-[11px] font-bold uppercase tracking-[0.07em] text-ink", p.tint)}>
                    {p.tag}
                  </span>
                  <h3 className="display mt-3 text-[22px]">{p.name}</h3>
                </div>
                <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-text-2">
                  {p.body.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                  {p.keys ? <KeyFamilies rows={p.keys} /> : null}
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Honest alternatives                                                 */}
        {/* ------------------------------------------------------------------ */}
        <section className="mt-20">
          <h2 className="label text-text-3">Choices we would revisit</h2>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-text-2">
            No choice here is forever, and pretending otherwise would be dishonest. Each card says why the current pick is right
            at this size, and what we would move to when the numbers ask for it. Every one is a contained swap — each box sits
            behind a small interface, so one module changes and the rest of the system doesn&rsquo;t notice.
          </p>
          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {SWAPS.map((s) => (
              <Reveal key={s.area} className="flex flex-col rounded-[24px] border border-line bg-surface p-6">
                <p className="display text-[19px]">{s.area}</p>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.07em] text-text-3">Right today because</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {s.today.map((t, i) => (
                    <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-text-2">
                      <span className="mt-[9px] size-1 shrink-0 rounded-full bg-ink/40" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.07em] text-iris-strong">Tomorrow, at scale</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {s.tomorrow.map((t, i) => (
                    <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-text-2">
                      <span className="mt-[9px] size-1 shrink-0 rounded-full bg-iris" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>

        <p className="mt-16 border-t border-line pt-8 text-[14px] leading-relaxed text-text-3">
          The precise version of all of this is the code itself — every request and response is a declared schema, served live
          as{" "}
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/openapi.json`}
            className="font-medium text-text-2 underline-offset-4 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenAPI
          </a>
          . For the partner surface, start at <a href="/developers" className="font-medium text-text-2 underline-offset-4 hover:underline">/developers</a>.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Diagram                                                                     */
/* -------------------------------------------------------------------------- */

/** A dashed drop with a dot: how one band hands off to the next. */
function Connector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1" aria-hidden>
      <span className="h-7 w-px border-l border-dashed border-line-2" />
      {label ? (
        <span className="my-1 inline-flex items-center rounded-full border border-line bg-white/80 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.07em] text-text-2 backdrop-blur">
          {label}
        </span>
      ) : null}
      <span className="h-7 w-px border-l border-dashed border-line-2" />
      <span className="size-1.5 rounded-full bg-ink/40" />
    </div>
  );
}

function BandLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-baseline gap-2">
      <span className="font-mono text-[11px] text-text-3">{n}</span>
      <span className="label text-text-3">{children}</span>
    </p>
  );
}

function Diagram() {
  return (
    <figure aria-label="System diagram: browser to API to storage to outside providers">
      {/* 01 — the app */}
      <BandLabel n="01">Where you are</BandLabel>
      <div className="rounded-[24px] border border-line bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="display text-[20px]">The web app</p>
          <p className="font-mono text-[11px] text-text-3">Next.js · TypeScript</p>
        </div>
        <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-text-2">
          Marketing, sign-in, the watchlist, the catch-up. It holds no business logic — it renders what the API says and plays
          the narration.
        </p>
      </div>

      <Connector label="JSON over HTTPS · client generated from the OpenAPI spec" />

      {/* 02 — the API */}
      <BandLabel n="02">The service</BandLabel>
      <div className="rounded-[24px] border border-line bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="display text-[20px]">The API</p>
          <p className="font-mono text-[11px] text-text-3">Fastify · Node 22</p>
        </div>
        <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-text-2">
          Every request and response is a declared schema; the same schemas publish the OpenAPI document. Partners call the
          exact endpoints the app calls.
        </p>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <div className="rounded-[18px] bg-tile-slate p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink/60">Routes</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink/80">Auth, watchlists, market data, the partner surface. Validate, call a service, return.</p>
          </div>
          <div className="rounded-[18px] bg-ink p-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-white/60">The digest engine</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/80">
              A pure function. Prices in, ranked cards out. No network, no clock, no randomness — same input, same answer.
            </p>
          </div>
          <div className="rounded-[18px] bg-tile-lavender p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink/60">The story layer</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink/80">Finds the &ldquo;why&rdquo;: filings and news for the window, then a writer that may only rephrase them.</p>
          </div>
        </div>
      </div>

      <Connector label="reads and writes" />

      {/* 03 — state */}
      <BandLabel n="03">State</BandLabel>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="rounded-[24px] border border-line bg-surface p-6 shadow-card">
          <div className="flex items-baseline justify-between gap-2">
            <p className="display text-[18px]">Postgres</p>
            <p className="font-mono text-[11px] text-text-3">source of truth</p>
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-text-2">Users, watchlists, checkpoints, the instrument universe. Nothing here is ever guessed back from a cache.</p>
        </div>
        <div className="rounded-[24px] border border-line bg-surface p-6 shadow-card">
          <div className="flex items-baseline justify-between gap-2">
            <p className="display text-[18px]">Redis</p>
            <p className="font-mono text-[11px] text-text-3">cache + queue</p>
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-text-2">Quotes, stories, and voice clips — shared by everyone, keyed per stock. Also carries the worker&rsquo;s job queue.</p>
        </div>
        <div className="flex flex-col justify-center rounded-[24px] bg-tile-gold p-6 sm:max-w-[220px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink/60">The worker</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink/80">Warms the cache on a schedule so the API mostly reads. Quotes every 20s; evidence every 10 min; history after the close.</p>
        </div>
      </div>

      <Connector label="fetched by the worker and on demand · every source can fail alone" />

      {/* 04 — the outside world */}
      <BandLabel n="04">The outside world</BandLabel>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PROVIDERS.map((p) => (
          <div key={p.name} className={cx("rounded-[20px] p-5", p.tint)}>
            <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink/60">{p.role}</p>
            <p className="display mt-1 text-[17px] text-ink">{p.name}</p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-ink/70">{p.note}</p>
          </div>
        ))}
      </div>

      <figcaption className="mt-5 text-center text-[12.5px] text-text-3">
        Every arrow crosses a small interface. Swap a box; the rest doesn&rsquo;t notice.
      </figcaption>
    </figure>
  );
}

const PROVIDERS = [
  { role: "Prices", name: "Yahoo Finance", note: "NSE/BSE quotes and candles, 15-minute delayed. Free.", tint: "bg-tile-sky" },
  { role: "Filings", name: "BSE announcements", note: "Official corporate filings, minutes after they land.", tint: "bg-tile-sage" },
  { role: "News", name: "Google News RSS", note: "The Indian business press, keyless and free.", tint: "bg-tile-apricot" },
  { role: "Writer", name: "OpenAI GPT", note: "Writes the why — from our facts only, or it's discarded.", tint: "bg-tile-lavender" },
  { role: "Voice", name: "Cartesia", note: "Reads the catch-up aloud. Every sentence cached.", tint: "bg-tile-blush" },
] as const;

/* -------------------------------------------------------------------------- */
/* The pieces                                                                  */
/* -------------------------------------------------------------------------- */

/** The cache, spelled out: what each key family holds and how long it lives. */
function KeyFamilies({ rows }: { rows: { key: string; what: string; ttl: string }[] }) {
  return (
    <div className="mt-2 overflow-hidden rounded-[18px] border border-line">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-canvas text-[10.5px] font-bold uppercase tracking-[0.07em] text-text-3">
            <th className="px-4 py-2.5 font-bold">Key</th>
            <th className="px-4 py-2.5 font-bold">Holds</th>
            <th className="px-4 py-2.5 text-right font-bold">Lives for</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.key} className="text-[13px]">
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px] text-text">{r.key}</td>
              <td className="px-4 py-2.5 text-text-2">{r.what}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-text-3 num">{r.ttl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PIECES: { tag: string; name: string; tint: string; body: string[]; keys?: { key: string; what: string; ttl: string }[] }[] = [
  {
    tag: "App",
    name: "A thin web app",
    tint: "bg-tile-sky",
    body: [
      "The app decides nothing about money. It renders cards, draws charts, and plays audio. All judgement — what ranks, what's quiet, what a move is worth — happens on the server, so a bug in the UI can't change an answer.",
      "Its API client is generated from the OpenAPI document at build time. If the contract changes, the frontend fails to compile instead of failing in front of a user.",
    ],
  },
  {
    tag: "Service",
    name: "A schema-first API",
    tint: "bg-tile-slate",
    body: [
      "Fastify, because it is small and treats schemas as the source of truth rather than an afterthought. Each route declares its request and response in zod; invalid input never reaches business code, and the same declarations publish the OpenAPI spec.",
      "The partner surface is the proof that this is an engine, not a website backend: a broker syncs a watchlist with an API key and gets the same digest our app gets.",
    ],
  },
  {
    tag: "Engine",
    name: "A pure digest engine",
    tint: "bg-tile-lavender",
    body: [
      "The heart of the product is one function: prices and events in, ranked cards out. It does no I/O and never looks at the clock, which means it is deterministic — we can test the ranking down to the decimal, and a card can always be reproduced from its inputs.",
      "It splits every move into the market's part and the stock's own part (a simple beta against the Nifty), because \"up 3%\" means something different on a day the whole market rose 3%.",
    ],
  },
  {
    tag: "Story",
    name: "A grounded story layer",
    tint: "bg-tile-sage",
    body: [
      "The engine says what moved; the story layer finds why. It gathers exchange filings and press coverage for exactly the window you were away, ranks filings above news, and drops near-duplicates.",
      "The writer is a language model on a short leash: it may only rephrase and connect the facts we hand it. Every number in its output must exist in the input and every claim must cite a listed source — anything that fails that check is thrown away and a plain template speaks instead. When nothing explains a move, the card says so.",
    ],
  },
  {
    tag: "Truth",
    name: "Postgres, for what must never be wrong",
    tint: "bg-tile-gold",
    body: [
      "Postgres holds accounts, sessions, watchlists, and checkpoints — the timestamps \"since\" is measured from, each stored with the prices the user saw. This data has one property the rest of the system doesn't: it cannot be re-fetched. Lose a quote and Yahoo has another; lose a checkpoint and the product's one question becomes unanswerable.",
      "Why relational and not a document store: this data is relations. A user owns watchlists, a watchlist has items, a checkpoint belongs to a watchlist. Foreign keys make \"delete this account and everything under it\" one safe statement instead of application code that can half-finish, and a transaction means a checkpoint and its snapshot land together or not at all.",
      "Why not something newer: Postgres is thirty years of production behavior, every host rents it, and when something breaks the answer is on the first page of a search. For a system whose value is being right, the most boring database is a feature.",
    ],
  },
  {
    tag: "Memory",
    name: "Redis, the memory everyone shares",
    tint: "bg-tile-blush",
    body: [
      "One question decided every key in Redis: if two people need this, is it the same bytes? Whenever the answer is yes, the value is keyed by the thing itself — a symbol, a hash of the text — never by the user. That single rule is why a million people watching Reliance cost one fetch, one written story, one narrated clip.",
      "Each family's lifetime matches how fast the data actually decays: a price is old news in a minute, a day's candles change once a day, a written story holds for the hour, and a narrated sentence never changes at all.",
      "Why Redis specifically: several API processes need to share one memory across deploys, which rules out an in-process map. And the job queue rides the same instance (BullMQ), so cache and queue are one dependency, not two. Everything in it is recomputable — flushing Redis costs a minute of latency, never a fact.",
    ],
    keys: [
      { key: "quote:SYMBOL", what: "the latest price, batched from upstream", ttl: "60 s" },
      { key: "candles:SYMBOL", what: "400 days of closes for the charts and the maths", ttl: "30 min" },
      { key: "evidence:SYMBOL", what: "filings and headlines for a window", ttl: "30 min" },
      { key: "story:HASH", what: "the written brief for one stock and window", ttl: "1 h" },
      { key: "tts:HASH", what: "one narrated sentence, as audio", ttl: "24 h" },
      { key: "bull:*", what: "the worker's job queue", ttl: "—" },
    ],
  },
  {
    tag: "Worker",
    name: "A worker, so users never pay for freshness",
    tint: "bg-tile-apricot",
    body: [
      "Caches expire — that's their job. Without a worker, the first person to arrive after every expiry pays the full upstream round-trip: a cold digest takes seconds, a warm one takes tens of milliseconds. At any real scale, someone is always that first person.",
      "The worker moves that cost off the user's click and onto a schedule shaped like the market itself: quotes for every watched symbol every twenty seconds, evidence every ten minutes, daily history once at 15:45 IST after the close. The API is left doing almost nothing but reading warm memory.",
      "It runs as a separate process and shares nothing with the API except Postgres and Redis, so it can crash, restart, or fall behind without a user ever noticing. Its jobs are idempotent — running one twice is merely wasteful, never wrong.",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Honest alternatives                                                         */
/* -------------------------------------------------------------------------- */

const SWAPS: { area: string; today: string[]; tomorrow: string[] }[] = [
  {
    area: "Market data",
    today: [
      "Yahoo Finance is free, keyless, and batched — one call prices many symbols.",
      "The 15-minute delay is disclosed, not hidden: every response carries its freshness, and the UI says so.",
    ],
    tomorrow: [
      "A broker's WebSocket feed (Upstox, Dhan, Angel One) for real-time prices, properly licensed for a commercial product.",
      "The swap is one provider file. The cache, the engine, and the app don't change — the feed just starts pushing instead of being polled.",
    ],
  },
  {
    area: "News",
    today: [
      "Google News RSS carries the papers Indian investors actually read; BSE filings come straight from the source. Both free, both keyless.",
      "Relevance and dedupe are ours, which keeps us honest about what \"related to this stock\" means.",
    ],
    tomorrow: [
      "Accumulate our own archive: the worker already polls every ten minutes, so appending headlines to Postgres gives us any look-back window and independence from the RSS recency limit.",
      "Or buy entity resolution — a ticker-tagged news API — once volume justifies paying for the hardest part of news.",
    ],
  },
  {
    area: "Postgres",
    today: [
      "The data is relational and small; transactions and foreign keys do work we'd otherwise write ourselves.",
      "One instance handles a large pilot with room to spare.",
    ],
    tomorrow: [
      "A read replica when reads dominate writes — the API is already read-heavy by design.",
      "If we ever store ticks or compute heavy analytics, price history graduates to a time-series store (ClickHouse, Timescale). Users and watchlists stay in Postgres either way.",
    ],
  },
  {
    area: "Redis",
    today: [
      "The entire market fits in well under 100 MB, because everything is keyed per symbol, never per user.",
      "Cache and job queue in one dependency; losing it costs a minute of latency, never a fact.",
    ],
    tomorrow: [
      "A managed, replicated Redis for failover — a config change, not a code change, since the API already treats it as disposable.",
      "If cache stampedes ever cross process boundaries, the per-process single-flight gains a Redis lock.",
    ],
  },
  {
    area: "Sign-in",
    today: [
      "Phone, password, and an OTP — the flow every Indian investor already knows from their broker.",
      "Sessions are httpOnly cookies, server-side, so multi-device works and nothing secret lives in the browser.",
    ],
    tomorrow: [
      "Google sign-in and passkeys, added beside the existing flow. One auth module owns identity, so this is a new route, not a rewrite.",
    ],
  },
  {
    area: "Scale-out",
    today: [
      "One API process and one worker — comfortably enough for a large pilot, and simple enough to debug at 2 am.",
    ],
    tomorrow: [
      "The API holds no state, so scaling out is running more of it behind a load balancer.",
      "The worker stays singular; its schedule is about the market's rhythm, not user traffic.",
    ],
  },
];
