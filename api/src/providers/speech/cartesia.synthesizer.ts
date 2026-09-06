import { UpstreamError } from "../../lib/errors.js";
import type { SpeechAudio, SpeechRequest, SpeechSynthesizer } from "./ports.js";

/**
 * Cartesia Sonic. Low latency, natural prosody, tuned for Indian English.
 * A calm, even read — a presenter telling you what happened, not selling it.
 */
export class CartesiaSpeechSynthesizer implements SpeechSynthesizer {
  readonly name = "cartesia";
  readonly enabled = true;

  constructor(
    private readonly apiKey: string,
    private readonly voice: string,
    private readonly model = "sonic-3.6",
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async synthesize(request: SpeechRequest): Promise<SpeechAudio> {
    // One retry covers the transient DNS / connection-reset failures we have seen in practice.
    try {
      return await this.once(request);
    } catch (e) {
      if (e instanceof UpstreamError) throw e;
      try {
        return await this.once(request);
      } catch (again) {
        throw new UpstreamError("Voice is unavailable right now", { provider: this.name, cause: again instanceof Error ? again.message : String(again) });
      }
    }
  }

  private async once(request: SpeechRequest): Promise<SpeechAudio> {
    let res: Response;
    try {
      res = await this.fetchImpl("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "cartesia-version": "2026-08-14",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model_id: this.model,
        transcript: request.text,
        voice: { id: this.voice },
        locale: "en-IN",
        output_format: { container: "mp3", sample_rate: 44100, bit_rate: 128000 },
        generation_config: { speed: 1, volume: 1, emotion: "calm" },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    } catch (e) {
      throw new NetworkError(e);
    }
    if (!res.ok) throw new UpstreamError("Voice is unavailable right now", { provider: this.name, status: res.status });
    return { bytes: new Uint8Array(await res.arrayBuffer()), mimeType: "audio/mpeg" };
  }
}

/** A failure before any HTTP status: DNS, reset, timeout. Retried once, then surfaced as 503. */
class NetworkError extends Error {
  constructor(cause: unknown) {
    super("Voice service unreachable", { cause });
  }
}
