import type { Env } from "../../config/env.js";
import { AnthropicModel } from "./anthropic.model.js";
import { NoopLanguageModel } from "./noop.model.js";
import { isReasoningModel, OpenAiCompatibleModel } from "./openai-compatible.model.js";
import type { LanguageModel } from "./ports.js";

export type { LanguageModel, CompletionRequest } from "./ports.js";

/**
 * The one place a model is chosen. Missing credentials degrade to no‑op,
 * never to a crash. Vendor‑native key names (OPENAI_API_KEY, …) are honoured
 * so a key pasted from the vendor's dashboard just works.
 */
export function createLanguageModel(env: Env): LanguageModel {
  switch (env.AI_PROVIDER) {
    case "none":
      return new NoopLanguageModel();
    case "openai": {
      const key = env.AI_API_KEY ?? env.OPENAI_API_KEY;
      if (!key) return new NoopLanguageModel();
      const model = env.AI_MODEL ?? "gpt-6-astra";
      return new OpenAiCompatibleModel("openai", "https://api.openai.com/v1", key, model, {
        reasoning: isReasoningModel(model),
        reasoningEffort: "low",
      });
    }
    case "sarvam": {
      const key = env.AI_API_KEY ?? env.SARVAM_API_KEY;
      if (!key) return new NoopLanguageModel();
      return new OpenAiCompatibleModel("sarvam", "https://api.sarvam.ai/v1", key, env.AI_MODEL ?? "sarvam-m");
    }
    case "anthropic": {
      const key = env.AI_API_KEY ?? env.ANTHROPIC_API_KEY;
      if (!key) return new NoopLanguageModel();
      return new AnthropicModel(key, env.AI_MODEL ?? "claude-sonnet-4-5");
    }
  }
}
