import { API_URL } from "@/lib/api/client";
import type { ScriptSegment } from "@/lib/api/types";

/** Reading-speed fallback when there is no audio: ~2.8 words/sec plus a beat. */
const readingMs = (text: string) => Math.max(2500, (text.split(/\s+/).length / 2.8) * 1000 + 1200);

export interface NarrationState {
  index: number;
  playing: boolean;
  /** 0..1 within the current segment. */
  progress: number;
  hasAudio: boolean;
  /** Waiting for the voice clip of the current segment. */
  loading: boolean;
  muted: boolean;
  ended: boolean;
}

/** Fetches one narrated segment, retrying once; resolves null on failure so the engine falls back to reading time. */
async function fetchAudio(text: string, signal: AbortSignal, attempt = 0): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/v1/speech`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal,
    });
    if (res.status >= 500 && attempt === 0) return fetchAudio(text, signal, 1);
    if (!res.ok) return null;
    return URL.createObjectURL(await res.blob());
  } catch {
    if (signal.aborted || attempt > 0) return null;
    return fetchAudio(text, signal, 1);
  }
}

/**
 * Prime the server-side TTS cache as soon as a digest is ready. The bytes are
 * deliberately discarded; when Play is pressed the normal request receives
 * the same clip from Redis instead of waiting for synthesis.
 */
export async function warmVoice(text: string, signal: AbortSignal): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/v1/speech`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal,
    });
    if (res.ok) await res.arrayBuffer();
  } catch {
    // Warm-up is an optimisation. The player keeps its own retry + fallback.
  }
}

/** A pausable clock reporting 0..1. Used when a segment has no audio. */
class ReadingClock {
  private raf = 0;
  private startedAt = 0;
  private elapsed = 0;
  constructor(
    private readonly dur: number,
    private readonly onTick: (p: number) => void,
    private readonly onDone: () => void,
  ) {}
  start() {
    this.startedAt = performance.now();
    const tick = () => {
      const p = Math.min(1, (this.elapsed + performance.now() - this.startedAt) / this.dur);
      this.onTick(p);
      if (p >= 1) this.onDone();
      else this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  pause() {
    cancelAnimationFrame(this.raf);
    this.elapsed += performance.now() - this.startedAt;
  }
  stop() {
    cancelAnimationFrame(this.raf);
  }
}

/**
 * Plays a digest script: one segment at a time, audio fetched one ahead,
 * reading clock when speech is unavailable. Framework-agnostic; React
 * subscribes with useSyncExternalStore. Call dispose() when done.
 */
export class NarrationEngine {
  private state: NarrationState = { index: 0, playing: true, progress: 0, hasAudio: false, loading: false, muted: false, ended: false };
  private readonly listeners = new Set<() => void>();
  private readonly urls = new Map<string, Promise<string | null>>();
  private readonly controllers: AbortController[] = [];
  private audio: HTMLAudioElement | null = null;
  private clock: ReadingClock | null = null;
  private loadToken = 0;

  /**
   * @param audio An element already played inside a user gesture (see
   *   audio-unlock.ts). Without it, browsers may refuse the first play().
   * @param startIndex Segment to begin from, so playback can resume from
   *   whichever stock is on stage instead of always starting at the intro.
   */
  constructor(
    private readonly script: ScriptSegment[],
    private readonly speechEnabled: boolean,
    audio: HTMLAudioElement | null = null,
    private readonly startIndex = 0,
  ) {
    this.audio = audio;
    // The first paint can immediately explain the real wait instead of
    // flashing the intro before start() begins fetching its voice clip.
    this.state = { ...this.state, index: startIndex, loading: speechEnabled };
  }

  // ---- store protocol -------------------------------------------------
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.state;

  private set(patch: Partial<NarrationState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  // ---- lifecycle -----------------------------------------------------
  start() {
    void this.load(this.startIndex);
  }

  dispose() {
    this.loadToken++;
    this.clock?.stop();
    this.audio?.pause();
    this.controllers.forEach((c) => c.abort());
    this.urls.forEach((p) => void p.then((u) => u && URL.revokeObjectURL(u)));
    // Forget the (now revoked) URLs so a restarted engine — React StrictMode
    // mounts twice in dev — fetches fresh clips instead of playing dead ones.
    this.urls.clear();
    this.listeners.clear();
  }

  // ---- controls ------------------------------------------------------
  go = (i: number) => {
    const idx = Math.min(Math.max(0, i), this.script.length - 1);
    this.set({ ended: false, playing: true });
    void this.load(idx);
  };
  next = () => {
    if (this.state.index >= this.script.length - 1) {
      this.stopSources();
      this.set({ ended: true, playing: false, progress: 1 });
      return;
    }
    void this.load(this.state.index + 1);
  };
  prev = () => void this.load(Math.max(0, this.state.index - 1));
  toggle = () => {
    if (this.state.ended) return this.go(0);
    const playing = !this.state.playing;
    this.set({ playing });
    if (this.state.hasAudio && this.audio) {
      if (playing) this.audio.play().catch(() => undefined);
      else this.audio.pause();
    } else if (this.clock) {
      if (playing) this.clock.start();
      else this.clock.pause();
    }
  };
  setMuted = (muted: boolean) => {
    this.set({ muted });
    if (this.audio) this.audio.muted = muted;
  };
  /** Voice failed for this segment (network, provider): forget the failure and try again. */
  retryVoice = () => {
    const s = this.script[this.state.index];
    if (!s || !this.speechEnabled) return;
    this.urls.delete(s.id);
    void this.load(this.state.index);
  };

  // ---- internals -----------------------------------------------------
  private prefetch(i: number) {
    const s = this.script[i];
    if (!s || !this.speechEnabled || this.urls.has(s.id)) return;
    const c = new AbortController();
    this.controllers.push(c);
    const p = fetchAudio(s.text, c.signal);
    this.urls.set(s.id, p);
    void p.then((u) => {
      if (u === null && this.urls.get(s.id) === p) this.urls.delete(s.id);
    });
  }

  private stopSources() {
    this.clock?.stop();
    this.clock = null;
    this.audio?.pause();
  }

  private async load(index: number) {
    const token = ++this.loadToken;
    const segment = this.script[index];
    if (!segment) return;
    this.stopSources();
    this.set({ index, progress: 0, hasAudio: false, loading: this.speechEnabled, ended: false });
    this.prefetch(index);
    this.prefetch(index + 1);

    const startClock = () => {
      const c = new ReadingClock(
        readingMs(segment.text),
        (p) => this.set({ progress: p }),
        () => this.next(),
      );
      this.clock = c;
      if (this.state.playing) c.start();
    };

    const url = this.speechEnabled ? await this.urls.get(segment.id) : null;
    if (token !== this.loadToken) return; // superseded by another navigation
    this.set({ loading: false });
    if (!url) return startClock();

    const el = (this.audio ??= new Audio());
    el.src = url;
    el.muted = this.state.muted;
    el.onended = () => token === this.loadToken && this.next();
    el.ontimeupdate = () => token === this.loadToken && el.duration && this.set({ progress: el.currentTime / el.duration });
    this.set({ hasAudio: true });
    if (this.state.playing) el.play().catch(startClock);
  }
}
