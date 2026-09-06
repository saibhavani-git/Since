import { NotConfiguredError } from "../../lib/errors.js";
import type { SpeechAudio, SpeechSynthesizer } from "./ports.js";

/** Voice is optional. Without a key the product still reads perfectly; it just doesn't speak. */
export class NoopSpeechSynthesizer implements SpeechSynthesizer {
  readonly name = "none";
  readonly enabled = false;

  async synthesize(): Promise<SpeechAudio> {
    throw new NotConfiguredError("Voice narration");
  }
}
