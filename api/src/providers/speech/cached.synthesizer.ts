import type { KeyValueStore } from "../../lib/cache/index.js";
import { sha256 } from "../../lib/ids.js";
import { SingleFlight } from "../../lib/single-flight.js";
import type { SpeechAudio, SpeechRequest, SpeechSynthesizer } from "./ports.js";
import { spoken } from "./spoken.js";

/**
 * Decorator: audio keyed by (provider, text) in the shared store.
 * The same sentence is spoken once for everyone; replays are free.
 */
export class CachedSpeechSynthesizer implements SpeechSynthesizer {
  readonly name: string;
  readonly enabled: boolean;
  private readonly flight = new SingleFlight();

  constructor(
    private readonly inner: SpeechSynthesizer,
    private readonly store: KeyValueStore,
    private readonly ttlSeconds = 24 * 3600,
  ) {
    this.name = inner.name;
    this.enabled = inner.enabled;
  }

  async synthesize(raw: SpeechRequest): Promise<SpeechAudio> {
    // Normalise before hashing so "same sentence" means "same audio" regardless of citation markers.
    const request: SpeechRequest = { ...raw, text: spoken(raw.text) };
    const key = `tts:${sha256(`${this.inner.name}|${request.text}`)}`;
    const hit = await this.store.getBytes(key);
    if (hit) return { bytes: hit, mimeType: "audio/mpeg" };
    return this.flight.run(key, async () => {
      const audio = await this.inner.synthesize(request);
      await this.store.setBytes(key, audio.bytes, this.ttlSeconds);
      return audio;
    });
  }
}
