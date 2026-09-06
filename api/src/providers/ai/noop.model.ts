import type { CompletionRequest, LanguageModel } from "./ports.js";

/** Returns the prompt unchanged. Lets callers stay branch‑free when no model is configured. */
export class NoopLanguageModel implements LanguageModel {
  readonly name = "none";
  readonly enabled = false;

  async complete(request: CompletionRequest): Promise<string> {
    return request.prompt;
  }
}
