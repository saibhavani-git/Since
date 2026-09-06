"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { IconPause, IconPlay, IconPlus } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/use-session";
import { useAddStock } from "@/features/watchlist/add-stock-provider";
import { usePrimaryWatchlist } from "@/features/watchlist/use-watchlists";
import { ApiError } from "@/lib/api/client";
import type { DigestCard, ScriptSegment } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { primeAudio } from "./audio-unlock";
import { DigestPreparing } from "./briefing-loader";
import { CatchUpDeck, companyDisplayName } from "./catch-up-deck";
import { warmVoice } from "./narration-engine";
import { selectionToSince, sinceLabel, SincePicker, type SinceSelection } from "./since-picker";
import { useDigest, useRecordVisit, useSpeechStatus } from "./use-digest";
import { useNarration } from "./use-narration";

/**
 * One briefing, one active stock. Changing the look-back window replaces the
 * current briefing only after the new one is ready, so a month never appears
 * under yesterday's data.
 *
 * Playback happens in place: pressing Play narrates through the deck itself —
 * one segment per stock (the move, then the 30-second read), built from the
 * cards so segments map one-to-one to the deck. The stock being read takes
 * the stage; when its segment ends the next one arrives. Playback starts from
 * whichever stock is on stage. There is no separate player screen.
 */
export function CatchUp() {
  const params = useSearchParams();
  const welcome = params.get("welcome") === "1";
  const session = useSession();
  const { watchlist, isLoading: listLoading } = usePrimaryWatchlist();
  const [sinceSel, setSinceSel] = useState<SinceSelection>({ kind: "preset", preset: "checkpoint" });
  const since = useMemo(() => selectionToSince(sinceSel), [sinceSel]);
  const digest = useDigest(watchlist?.id ?? null, { since });
  const speech = useSpeechStatus();
  const { open } = useAddStock();

  /**
   * The primed <audio> element doubles as the "narrating" flag; it is created
   * inside the Play click so the narration may start with sound.
   */
  const [narration, setNarration] = useState<{ audio: HTMLAudioElement | null } | null>(null);
  /** The stock on stage — set by hand or by the narration as it advances. Play resumes from here. */
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  /** What the narration is doing right now, so the button can say so. */
  const [playState, setPlayState] = useState<PlaybackState>("preparing");

  const stopPlayback = useCallback(() => setNarration(null), []);
  /** Manual navigation takes over: remember the stock and stop the voice. */
  const navigate = useCallback((symbol: string) => {
    setActiveSymbol(symbol);
    setNarration(null);
  }, []);
  /** A finished catch-up starts from the top next time. */
  const endPlayback = useCallback(() => {
    setNarration(null);
    setActiveSymbol(null);
  }, []);
  const stagedBy = useCallback((symbol: string | null) => {
    if (symbol) setActiveSymbol(symbol);
  }, []);
  const togglePlayback = () => {
    if (narration) return stopPlayback();
    setPlayState("preparing");
    setNarration({ audio: primeAudio() });
  };

  /** What the voice will say, one segment per stock, in deck order. */
  const script = useMemo(() => (digest.data ? buildNarrationScript(digest.data.cards) : []), [digest.data]);

  // Prime the server's TTS cache for the first segment so Play starts fast.
  useEffect(() => {
    const first = script[0];
    if (!speech.data?.enabled || !first) return;
    const controller = new AbortController();
    void warmVoice(first.text, controller.signal);
    return () => controller.abort();
  }, [script, speech.data?.enabled]);

  // Seeing the catch-up *is* being caught up. Record the visit after a short
  // dwell — no button. The server ignores this sitting's checkpoints when it
  // resolves "since", so a refresh never blanks the page mid-visit.
  const recordVisit = useRecordVisit(watchlist?.id ?? null).mutate;
  useEffect(() => {
    if (!digest.data) return;
    const t = setTimeout(() => recordVisit(), VISIT_DWELL_MS);
    return () => clearTimeout(t);
  }, [digest.data, recordVisit]);

  if (listLoading) return <CatchUpSkeleton />;

  if (!watchlist || watchlist.items.length === 0) {
    return (
      <div className="mx-auto max-w-[640px] pt-8">
        <p className="label text-text-3">{welcome ? `Welcome, ${session.data?.name.split(" ")[0]}` : "Your watchlist"}</p>
        <h1 className="display mt-3 text-[40px] leading-[0.98] sm:text-[56px]">Start with one stock you care about.</h1>
        <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-text-2">
          Add it, tell Since why you&apos;re watching, and close the tab. The next time you open Since it tells you what changed — and whether that matters to you.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => open()}>
            <IconPlus width={18} height={18} /> Add a stock
          </Button>
          <Button size="lg" variant="ghost" onClick={() => open({ symbol: "RELIANCE" })}>
            Try Reliance
          </Button>
        </div>
      </div>
    );
  }

  if (digest.isError) {
    const e = digest.error;
    return (
      <Empty
        title="Couldn't build your catch-up."
        body={e instanceof ApiError && e.status === 503 ? "Market data is unavailable right now. Try again in a minute." : e.message}
        action={
          <Button onClick={() => digest.refetch()} loading={digest.isFetching}>
            Try again
          </Button>
        }
      />
    );
  }

  const changeSince = (next: SinceSelection) => {
    endPlayback();
    setSinceSel(next);
  };
  const preparing = digest.isPending || digest.isPlaceholderData;
  const d = digest.data;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="label text-text-3">{sinceLabel(sinceSel)}</p>
          <h1 className="display mt-3 max-w-[18ch] text-[40px] leading-[0.98] sm:text-[54px]">
            {preparing || !d ? "Let’s see what changed." : d.verdict.headline}
          </h1>
          {d && !preparing ? (
            <p className="mt-3 text-[14px] text-text-3">
              {d.gap.sessions} {d.gap.sessions === 1 ? "market session" : "market sessions"} checked · {d.cards.length} worth {d.cards.length === 1 ? "a look" : "your attention"}
            </p>
          ) : null}
        </div>
        <SincePicker value={sinceSel} onChange={changeSince} />
      </header>

      {preparing || !d ? (
        <DigestPreparing period={sinceLabel(sinceSel)} items={watchlist.items} />
      ) : (
        <>
          <CatchUpDeck
            key={`deck-${d.since.at}`}
            digest={d}
            focusSymbol={activeSymbol}
            onNavigate={navigate}
            actions={
              script.length > 0 ? (
                <PlayButton state={narration ? playState : "idle"} speechEnabled={!!speech.data?.enabled} onToggle={togglePlayback} />
              ) : null
            }
          />

          {narration && script.length > 0 ? (
            <NarrationDriver
              key={`narration-${d.since.at}`}
              script={script}
              speechEnabled={!!speech.data?.enabled}
              audio={narration.audio}
              startSymbol={activeSymbol}
              onStage={stagedBy}
              onStatus={setPlayState}
              onEnded={endPlayback}
            />
          ) : null}

          {d.quiet.length > 0 && d.cards.length > 0 ? (
            <p className="border-y border-line py-4 text-[13px] leading-relaxed text-text-3">
              <span className="mr-2 inline-block size-1.5 rounded-full bg-rise align-middle" />
              {d.quiet.length} {d.quiet.length === 1 ? "other stock stayed" : "other stocks stayed"} within the usual range
              <span className="text-text-2"> · {d.quiet.slice(0, 4).map((item) => item.symbol).join(", ")}{d.quiet.length > 4 ? ` +${d.quiet.length - 4}` : ""}</span>
            </p>
          ) : null}

          {d.unavailable.length > 0 ? (
            <p className="text-[13px] text-text-3">
              Couldn&apos;t get data for {d.unavailable.map((item) => item.name).join(", ")} this time. They remain on your watchlist.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

/** What the play button reports: idle, fetching the voice, or narrating. */
type PlaybackState = "idle" | "preparing" | "playing";

/** A glance counts as a look; an accidental tab does not. */
const VISIT_DWELL_MS = 5_000;

/** The one control: a brand-purple pill that plays the catch-up, or stops it. */
function PlayButton({ state, speechEnabled, onToggle }: { state: PlaybackState; speechEnabled: boolean; onToggle: () => void }) {
  const label = state === "idle" ? (speechEnabled ? "Play catch-up" : "Read catch-up") : state === "preparing" ? "Preparing…" : "Stop";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={state !== "idle"}
      className="group inline-flex h-12 items-center gap-3 rounded-full bg-iris p-1.5 pr-6 text-white shadow-float transition-colors duration-200 hover:bg-iris-strong"
    >
      <span
        className={cx(
          "flex size-9 items-center justify-center rounded-full bg-white text-iris transition-transform duration-200 group-hover:scale-105",
          state === "preparing" && "animate-pulse",
        )}
      >
        {state === "playing" ? <IconPause width={15} height={15} /> : <IconPlay width={15} height={15} />}
      </span>
      <span className="text-[14px] font-semibold">{label}</span>
    </button>
  );
}

/**
 * Drives the deck while the catch-up plays. Renders nothing itself: it runs
 * the narration engine (voice with a reading-time fallback), tells the deck
 * which stock is on stage, and reports when the script has finished.
 *
 * Playback starts at `startSymbol` — the stock the user is looking at — and
 * continues through the rest of the deck in order.
 */
function NarrationDriver({
  script,
  speechEnabled,
  audio,
  startSymbol,
  onStage,
  onStatus,
  onEnded,
}: {
  script: ScriptSegment[];
  speechEnabled: boolean;
  audio: HTMLAudioElement | null;
  startSymbol: string | null;
  onStage: (symbol: string | null) => void;
  onStatus: (state: PlaybackState) => void;
  onEnded: () => void;
}) {
  const startIndex = Math.max(0, script.findIndex((s) => s.symbol === startSymbol));
  const n = useNarration(script, speechEnabled, audio, startIndex);
  const symbol = n.segment.symbol;

  useEffect(() => onStage(symbol), [symbol, onStage]);
  useEffect(() => onStatus(n.loading ? "preparing" : "playing"), [n.loading, onStatus]);
  useEffect(() => {
    if (n.ended) onEnded();
  }, [n.ended, onEnded]);

  return null;
}

/** The catch-up script: one spoken segment per stock, in deck order. */
function buildNarrationScript(cards: DigestCard[]): ScriptSegment[] {
  return cards.map((card) => ({ id: `speak-${card.symbol}`, kind: "card", symbol: card.symbol, text: narrationText(card) }));
}

/** What the voice says for one stock: the move first, then the 30-second read. */
function narrationText(card: DigestCard): string {
  const name = companyDisplayName(card.instrument.name);
  const price = `${card.priceNow.toFixed(2)} rupees`;
  const move =
    card.move.totalPct === 0
      ? `${name} is unchanged at ${price} since you last looked.`
      : `${name} is ${card.move.totalPct > 0 ? "up" : "down"} ${Math.abs(card.move.totalPct).toFixed(1)} percent since you last looked, at ${price}.`;
  return `${move} ${card.summary}`;
}

function CatchUpSkeleton() {
  return (
    <div className="flex flex-col gap-7" aria-busy>
      <div className="flex items-end justify-between">
        <div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-12 w-72 max-w-full" />
        </div>
        <Skeleton className="hidden h-12 w-[430px] rounded-full sm:block" />
      </div>
      <Skeleton className="h-[610px] rounded-[28px]" />
    </div>
  );
}
