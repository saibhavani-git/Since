import { UpstreamError } from "../../lib/errors.js";
import type { CompletionRequest, LanguageModel } from "./ports.js";

export interface WireOptions {
  /**
   * OpenAI's reasoning family (gpt‑5+, gpt‑6, o‑series) takes
   * `max_completion_tokens`, rejects non‑default `temperature`, and accepts
   * `reasoning_effort`. Older models and Sarvam use the classic shape.
   */
  reasoning: boolean;
  reasoningEffort?: "low" | "medium" | "high";
}

/**
 * Chat‑completions adapter. OpenAI and Sarvam both speak this wire format,
 * so one class serves both with a different base URL and model name.
 */
export class OpenAiCompatibleModel implements LanguageModel {
  readonly enabled = true;

  constructor(
    readonly name: string,
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly wire: WireOptions = { reasoning: false },
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(request: CompletionRequest): Promise<string> {
    const maxTokens = request.maxTokens ?? 300;
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.prompt },
      ],
    };
    if (this.wire.reasoning) {
      // Reasoning tokens count against the budget; leave head‑room so short answers are not truncated.
      body.max_completion_tokens = maxTokens + 400;
      body.reasoning_effort = this.wire.reasoningEffort ?? "low";
    } else {
      body.max_tokens = maxTokens;
      body.temperature = request.temperature ?? 0.3;
    }

    const res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new UpstreamError(`${this.name} is unavailable`, { status: res.status, detail: detail.slice(0, 300) });
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) throw new UpstreamError(`${this.name} returned an empty completion`);
    return text;
  }
}

/** Model ids that use the reasoning wire shape. */
export const isReasoningModel = (model: string): boolean => /^(gpt-5|gpt-6|o\d)/i.test(model);
