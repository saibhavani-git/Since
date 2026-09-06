import type { Env } from "../../config/env.js";
import type { KeyValueStore } from "../../lib/cache/index.js";
import type { Logger } from "../../lib/logger.js";
import { CachedSpeechSynthesizer } from "./cached.synthesizer.js";
import { CartesiaSpeechSynthesizer } from "./cartesia.synthesizer.js";
import { NoopSpeechSynthesizer } from "./noop.synthesizer.js";
import type { SpeechSynthesizer } from "./ports.js";
import { SarvamSpeechSynthesizer } from "./sarvam.synthesizer.js";

export type { SpeechSynthesizer, SpeechRequest, SpeechAudio } from "./ports.js";

/** The one place a voice is chosen. Missing credentials degrade to silence, never to a crash. */
export function createSpeechSynthesizer(env: Env, store: KeyValueStore, log: Logger): SpeechSynthesizer {
  const inner = select(env, log);
  return inner.enabled ? new CachedSpeechSynthesizer(inner, store) : inner;
}

/** Kiara — Indian‑accented, mature, enunciating. SPEECH_VOICE_ID overrides. */
const CARTESIA_VOICE = "f8f5f1b2-f02d-4d8e-a40d-fd850a487b3d";

function select(env: Env, log: Logger): SpeechSynthesizer {
  switch (env.SPEECH_PROVIDER) {
    case "none":
      return new NoopSpeechSynthesizer();
    case "cartesia": {
      const key = env.SPEECH_API_KEY ?? env.CARTESIA_API_KEY;
      if (!key) {
        log.warn("CARTESIA_API_KEY missing; voice disabled");
        return new NoopSpeechSynthesizer();
      }
      return new CartesiaSpeechSynthesizer(key, env.SPEECH_VOICE_ID ?? CARTESIA_VOICE, env.SPEECH_MODEL ?? "sonic-3.6");
    }
    case "sarvam": {
      const key = env.SPEECH_API_KEY ?? env.SARVAM_API_KEY;
      if (!key) {
        log.warn("SARVAM_API_KEY missing; voice disabled");
        return new NoopSpeechSynthesizer();
      }
      return new SarvamSpeechSynthesizer(key, env.SPEECH_VOICE_ID ?? "shubh", env.SPEECH_MODEL ?? "bulbul:v3");
    }
  }
}
