import type { Digest, DigestCard, QuietItem, Report, ScriptSegment, Source, StoryPoint, VerdictTone } from "../../contracts/index.js";
import type { KeyValueStore } from "../../lib/cache/index.js";
import type { Clock } from "../../lib/clock.js";
import { displayName } from "../../lib/format.js";
import { sha256 } from "../../lib/ids.js";
import { addDays, labelInstant } from "../../lib/ist.js";
import type { Logger } from "../../lib/logger.js";
import { INDEX_SYMBOL } from "../../providers/market-data/index.js";
import type { EvidenceItem, NewsProvider } from "../../providers/news/index.js";
import { phaseAt, holidayName, sessionsBetween } from "../market/calendar.js";
import { BSE_CODES } from "../market/instruments.js";
import type { MarketService } from "../market/market.service.js";
import { buildDigest, DEFAULT_ENGINE_CONFIG } from "./engine/index.js";
import { narrator } from "./engine/narrate.js";
import { numbersFor, toSource, type StoryFacts, type StoryWriter } from "./story/index.js";
import { cleanTitle } from "./story/points.js";
import { mentions } from "../../providers/news/relevance.js";

const EVIDENCE_PER_CARD = 14;
const EVIDENCE_PER_QUIET = 4;
const EVIDENCE_PER_REPORT = 12;
const SOURCES_SHOWN = 4;
/** How many points the voice reads out per card. */
const SPOKEN_POINTS = 2;

export interface StoryServiceDeps {
  news: NewsProvider;
  writer: StoryWriter;
  market: MarketService;
  store: KeyValueStore;
  clock: Clock;
  log: Logger;
  storyTtlSeconds: number;
}

/**
 * Attaches the "why" to what the engine decided. Evidence and prose
 * are cached per symbol and window, so a stock's story is written once no
 * matter how many watchlists contain it.
 */
export class StoryService {
  constructor(private readonly d: StoryServiceDeps) {}

  /**
   * Cards get the full story: the press and filings of the window as a list,
   * a better first line when the evidence supports one, and a script that
   * reads the news, not just the price. Quiet stocks get one line if the
   * papers wrote about them. Failures leave an item as the engine made it.
   */
  async enrich(digest: Digest, options: { curate?: boolean } = {}): Promise<Digest> {
    if (!this.d.news.enabled || (digest.cards.length === 0 && digest.quiet.length === 0)) return options.curate ? curateDigest(digest) : digest;
    const since = new Date(digest.since.at);
    const now = new Date(digest.generatedAt);

    const [cards, quiet] = await Promise.all([
      Promise.all(
        digest.cards.map(async (card): Promise<DigestCard> => {
          try {
            const evidence = await this.evidence(card.symbol, card.instrument.name, since, now, EVIDENCE_PER_CARD);
            const facts = this.facts(card, since, now, evidence, { nextResultsAt: null, exDividendAt: null });
            const story = await this.cached(`story:${this.factsKey(facts)}`, () => this.d.writer.story(facts));
            const shown = presentSources(null, evidence, SOURCES_SHOWN);
            return { ...card, headline: story.lead ?? card.headline, story: story.points, summary: story.summary, narration: story.narration, sources: shown.sources.map(toSource) };
          } catch (err) {
            this.d.log.warn({ err: String(err), symbol: card.symbol }, "story enrichment failed; card kept as is");
            return card;
          }
        }),
      ),
      Promise.all(
        digest.quiet.map(async (q): Promise<QuietItem> => {
          try {
            const evidence = await this.evidence(q.symbol, q.name, since, now, EVIDENCE_PER_QUIET);
            const top = evidence.filter((e) => e.kind === "news" && e.salience >= 0.6 && mentions(e.title, q.name, q.symbol)).sort((a, b) => b.salience - a.salience || b.publishedAt.getTime() - a.publishedAt.getTime())[0];
            return top ? { ...q, note: { title: cleanTitle(top.title), source: top.source, sourceUrl: top.sourceUrl, url: top.url, at: top.publishedAt.toISOString() } } : q;
          } catch (err) {
            this.d.log.warn({ err: String(err), symbol: q.symbol }, "quiet note failed; item kept as is");
            return q;
          }
        }),
      ),
    ]);

    const bySymbol = new Map(cards.map((c) => [c.symbol, c]));
    const script = digest.script.map((s): ScriptSegment => {
      const card = s.kind === "card" && s.symbol ? bySymbol.get(s.symbol) : undefined;
      return card ? { ...s, text: card.narration || spokenCard(card, now) } : s;
    });
    const enriched = { ...digest, cards, quiet, script };
    return options.curate ? curateDigest(enriched) : enriched;
  }

  /** The in‑depth view for one stock over a window, independent of any watchlist. */
  async report(symbol: string, since: Date): Promise<Report> {
    const now = this.d.clock.now();
    const [detail, candles, indexCandles, indexQuotes] = await Promise.all([
      this.d.market.stock(symbol),
      this.d.market.dailyCandles(symbol, addDays(now, -400)),
      this.d.market.dailyCandles(INDEX_SYMBOL, addDays(now, -400)),
      this.d.market.quotes([INDEX_SYMBOL]),
    ]);
    const indexQuote = indexQuotes.get(INDEX_SYMBOL) ?? null;

    // Reuse the engine for the numbers so the report never disagrees with the card.
    const digest = buildDigest(
      {
        watchlistId: "00000000-0000-0000-0000-000000000000",
        now,
        since,
        sinceReason: "requested",
        items: [
          {
            symbol,
            instrument: detail.instrument,
            thesis: null,
            addedAt: since,
            addedPrice: null,
            quote: toRaw(detail.quote),
            candles,
            events: {
              nextResultsAt: detail.events.nextResultsAt ? new Date(detail.events.nextResultsAt) : null,
              lastResultsAt: detail.events.lastResultsAt ? new Date(detail.events.lastResultsAt) : null,
              exDividendAt: detail.events.exDividendAt ? new Date(detail.events.exDividendAt) : null,
            },
            snapshotPrice: null,
          },
        ],
        index: { symbol: INDEX_SYMBOL, quote: indexQuote ? toRaw(indexQuote) : null, candles: indexCandles },
        market: { phase: phaseAt(now), holidayName: holidayName(now), sessions: sessionsBetween(since, now) },
        freshness: detail.quote.freshness,
      },
      { ...DEFAULT_ENGINE_CONFIG, maxCards: 1, minSignals: 0 },
    );
    const card = digest.cards[0];
    if (!card) throw new Error(`engine produced no card for ${symbol}`);

    const evidence = this.d.news.enabled ? await this.evidence(symbol, detail.instrument.name, since, now, EVIDENCE_PER_REPORT) : [];
    const facts = this.facts(card, since, now, evidence, {
      nextResultsAt: detail.events.nextResultsAt ? new Date(detail.events.nextResultsAt) : null,
      exDividendAt: detail.events.exDividendAt ? new Date(detail.events.exDividendAt) : null,
    });
    const body = await this.cached(`report:${this.factsKey(facts)}`, () => this.d.writer.report(facts));

    return {
      symbol,
      instrument: detail.instrument,
      since: since.toISOString(),
      generatedAt: now.toISOString(),
      headline: body.headline,
      why: body.why,
      sections: body.sections,
      numbers: numbersFor(facts),
      sources: evidence.map(toSource),
      move: card.move,
      series: card.series,
      sinceIndex: card.sinceIndex,
      writer: body.writer,
      freshness: detail.quote.freshness,
    };
  }

  /** Just the paper trail for one stock over a window — no engine, no writer. */
  async sources(symbol: string, since: Date): Promise<Source[]> {
    if (!this.d.news.enabled) return [];
    const now = this.d.clock.now();
    const detail = await this.d.market.stock(symbol);
    const items = await this.evidence(symbol, detail.instrument.name, since, now, EVIDENCE_PER_REPORT);
    return items.map(toSource);
  }

  private async evidence(symbol: string, name: string, from: Date, to: Date, limit: number): Promise<EvidenceItem[]> {
    // Boilerplate filings (Reg 30 intimations, shareholder mailers) are kept for the writer's context but never lead.
    const { items } = await this.d.news.search({ symbol, name, bseCode: BSE_CODES[symbol] ?? null, from, to, limit });
    return items;
  }

  private facts(
    card: DigestCard,
    since: Date,
    now: Date,
    evidence: EvidenceItem[],
    events: StoryFacts["events"],
  ): StoryFacts {
    return {
      symbol: card.symbol,
      name: displayName(card.instrument.name),
      since,
      now,
      priceThen: card.priceThen,
      priceNow: card.priceNow,
      move: card.move,
      moveInSigmas: card.volatility.moveInSigmas,
      volumeRatio: card.volumeRatio,
      signals: card.signals,
      headline: card.headline,
      evidence,
      events,
      series: card.series.map((p) => ({ t: new Date(p.t), c: p.c })),
      sinceIndex: card.sinceIndex,
    };
  }

  /** Same facts → same prose; the key is what the writer can see. */
  private factsKey(f: StoryFacts): string {
    return sha256(
      JSON.stringify([
        "news-first-v2",
        this.d.writer.name,
        f.symbol,
        f.since.toISOString().slice(0, 13),
        f.priceThen,
        f.priceNow,
        f.signals.map((s) => s.kind),
        f.evidence.map((e) => e.id),
      ]),
    ).slice(0, 32);
  }

  private async cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = await this.d.store.get<{ v: T }>(`story:${key}`);
    if (hit) return hit.v;
    const v = await fn();
    await this.d.store.set(`story:${key}`, { v }, this.d.storyTtlSeconds);
    return v;
  }

}

/**
 * Price thresholds decide whether a move is unusual; they must not decide
 * whether company news exists. Watchlist digests first enrich every stock,
 * then retain a card for either a real signal or a substantive news/filing
 * point. Only a stock with neither becomes quiet.
 */
export function curateDigest(digest: Digest): Digest {
  const hasUpdate = (card: DigestCard): boolean =>
    card.signals.length > 0 || card.story.some((point) => point.kind !== "price" && point.weight >= 0.25);
  const importance = (card: DigestCard): number => {
    const news = Math.max(0, ...card.story.filter((point) => point.kind !== "price").map((point) => point.weight));
    return card.score + news * 75;
  };

  const cards = digest.cards.filter(hasUpdate).sort((a, b) => importance(b) - importance(a));
  const kept = new Set(cards.map((card) => card.symbol));
  const demoted: QuietItem[] = digest.cards
    .filter((card) => !kept.has(card.symbol))
    .map((card) => ({
      symbol: card.symbol,
      name: card.instrument.name,
      priceNow: card.priceNow,
      changePct: card.move.totalPct,
      moveInSigmas: card.volatility.moveInSigmas,
      sparkline: card.series.slice(Math.max(0, card.sinceIndex - 6)).map((point) => point.c),
      note: null,
    }));
  const quietBySymbol = new Map([...digest.quiet, ...demoted].map((item) => [item.symbol, item]));
  const quiet = [...quietBySymbol.values()];

  const tone: VerdictTone = cards.length === 0 ? "nothing" : cards.some((card) => card.signals.some((signal) => signal.tier === 1)) ? "triggered" : "look";
  const verdict = narrator.verdict(tone, cards.length, quiet.length);
  const script: ScriptSegment[] = [
    { id: "intro", kind: "intro", symbol: null, text: narrator.spoken.intro(digest.gap.sinceLabel, verdict) },
    ...cards.map((card): ScriptSegment => ({ id: `card:${card.symbol}`, kind: "card", symbol: card.symbol, text: card.narration || card.headline })),
    ...(quiet.length
      ? [{ id: "quiet", kind: "quiet" as const, symbol: null, text: narrator.spoken.quiet(quiet.map((item) => item.name), quiet.length) }]
      : []),
    { id: "outro", kind: "outro", symbol: null, text: narrator.spoken.outro() },
  ];

  return { ...digest, cards, quiet, verdict, script };
}

function toRaw(q: { symbol: string; price: number; previousClose: number; open: number | null; dayHigh: number | null; dayLow: number | null; volume: number | null; averageVolume: number | null; fiftyTwoWeekHigh: number | null; fiftyTwoWeekLow: number | null; freshness: { asOf: string } }) {
  return { ...q, asOf: new Date(q.freshness.asOf) };
}

/**
 * What the card shows under the prose. Anything the writer cited comes first,
 * then the most substantive of the rest; routine compliance filings never
 * make it. Citation markers are renumbered to match the shown list.
 */
export function presentSources(why: string | null, evidence: EvidenceItem[], limit: number): { why: string | null; sources: EvidenceItem[] } {
  const cited = [...new Set([...(why ?? "").matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]) - 1))].filter((i) => i >= 0 && i < evidence.length);
  const rest = evidence
    .map((e, i) => ({ e, i }))
    .filter(({ e, i }) => !cited.includes(i) && e.salience >= 0.45)
    .sort((a, b) => b.e.salience - a.e.salience || (a.e.kind === "news" ? -1 : 1))
    .map(({ i }) => i);
  const order = [...cited, ...rest].slice(0, Math.max(limit, cited.length));
  const renumbered = why?.replace(/\[(\d+)\]/g, (_, n: string) => {
    const at = order.indexOf(Number(n) - 1);
    return at >= 0 ? `[${at + 1}]` : "";
  }) ?? null;
  return { why: renumbered, sources: order.map((i) => evidence[i]!) };
}

/** What the voice says for a card: the lead, then the top stories with who reported them and when. */
function spokenCard(card: DigestCard, now: Date): string {
  const news = card.story.filter((p) => p.kind !== "price").sort((a, b) => b.weight - a.weight).slice(0, SPOKEN_POINTS);
  if (news.length === 0) return card.headline;
  const lines = news.map((p) => spokenPoint(p, now));
  const head = /[.!?]$/.test(card.headline) ? card.headline : `${card.headline}.`;
  return `${head} ${lines.join(" ")}`;
}

const day = (at: Date, now: Date): string => labelInstant(at, now).replace(/,.*$/, "");
const spokenPoint = (p: StoryPoint, now: Date): string => `${cap(day(new Date(p.at), now))}, ${p.source}: ${p.title}.`;
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
