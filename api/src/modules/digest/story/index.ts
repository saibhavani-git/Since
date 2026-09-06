import type { Logger } from "../../../lib/logger.js";
import type { LanguageModel } from "../../../providers/ai/index.js";
import { ModelStoryWriter } from "./model.writer.js";
import type { StoryWriter } from "./ports.js";
import { TemplateStoryWriter } from "./template.writer.js";

export type { StoryWriter, StoryFacts, ReportBody } from "./ports.js";
export { toSource } from "./ports.js";
export { numbersFor } from "./template.writer.js";

/** Template always; model on top when one is configured. */
export function createStoryWriter(model: LanguageModel, log: Logger): StoryWriter {
  const template = new TemplateStoryWriter();
  return model.enabled ? new ModelStoryWriter(model, template, log) : template;
}
