import { UpstreamError } from "../../lib/errors.js";
import type { CompletionRequest, LanguageModel } from "./ports.js";

export class AnthropicModel implements LanguageModel {
  readonly name = "anthropic";
  readonly enabled = true;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(request: CompletionRequest): Promise<string> {
    const res = await this.fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 300,
        temperature: request.temperature ?? 0.3,
        system: request.system,
        messages: [{ role: "user", content: request.prompt }],
      }),
    });
    if (!res.ok) throw new UpstreamError("Anthropic is unavailable", { status: res.status });
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = json.content?.find((c) => c.type === "text")?.text?.trim();
    if (!text) throw new UpstreamError("Anthropic returned an empty completion");
    return text;
  }
}
