/**
 * Port: a language model. Deliberately tiny — one method — because the
 * product only uses a model to *polish* deterministic narration, never to
 * decide what matters. Vendors differ in request shape, not in
 * this contract.
 */
export interface LanguageModel {
  readonly name: string;
  /** Whether calls will actually reach a model. `false` for the no‑op adapter. */
  readonly enabled: boolean;
  complete(request: CompletionRequest): Promise<string>;
}

export interface CompletionRequest {
  system: string;
  prompt: string;
  /** Hard cap on output size; narration is short. */
  maxTokens?: number;
  temperature?: number;
}
