import { UpstreamError } from "../../lib/errors.js";
import type { SpeechAudio, SpeechRequest, SpeechSynthesizer } from "./ports.js";

/**
 * Sarvam Bulbul — built for Indian voices and code‑mixed text. Returns
 * base64 audio in JSON.
 */
export class SarvamSpeechSynthesizer implements SpeechSynthesizer {
  readonly name = "sarvam";
  readonly enabled = true;

  constructor(
    private readonly apiKey: string,
    private readonly speaker = "shubh",
    private readonly model = "bulbul:v3",
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async synthesize(request: SpeechRequest): Promise<SpeechAudio> {
    const res = await this.fetchImpl("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: { "api-subscription-key": this.apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        text: request.text.slice(0, 2400),
        language_code: "en-IN",
        speaker: this.speaker,
        model: this.model,
        pace: 1,
        speech_sample_rate: 24000,
        output_audio_codec: "mp3",
      }),
    });
    if (!res.ok) throw new UpstreamError("Voice is unavailable right now", { provider: this.name, status: res.status });
    const json = (await res.json()) as { audios?: string[] };
    const b64 = json.audios?.join("");
    if (!b64) throw new UpstreamError("Voice provider returned no audio", { provider: this.name });
    return { bytes: new Uint8Array(Buffer.from(b64, "base64")), mimeType: "audio/mpeg" };
  }
}
