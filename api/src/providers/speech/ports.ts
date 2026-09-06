/**
 * Port: text → spoken audio. The digest's narration is already written per
 * card; a synthesizer just voices it. Adapters own vendor voice ids, locale
 * mapping and output formats.
 */
export interface SpeechSynthesizer {
  readonly name: string;
  /** False for the no‑op adapter, so routes can 404 instead of returning silence. */
  readonly enabled: boolean;
  synthesize(request: SpeechRequest): Promise<SpeechAudio>;
}

export interface SpeechRequest {
  text: string;
}

export interface SpeechAudio {
  bytes: Uint8Array;
  mimeType: "audio/mpeg" | "audio/wav";
}
