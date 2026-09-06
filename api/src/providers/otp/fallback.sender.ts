import type { Logger } from "../../lib/logger.js";
import type { OtpDelivery, OtpSender } from "./ports.js";

/**
 * Composite: try senders in order, use the first that succeeds. Lets a
 * deployment run two SMS vendors without the auth service knowing.
 */
export class FallbackOtpSender implements OtpSender {
  readonly name: string;

  constructor(
    private readonly senders: readonly OtpSender[],
    private readonly log: Logger,
  ) {
    if (senders.length === 0) throw new Error("FallbackOtpSender needs at least one sender");
    this.name = `fallback(${senders.map((s) => s.name).join(" → ")})`;
  }

  async send(phone: string): Promise<OtpDelivery> {
    let lastError: unknown;
    for (const sender of this.senders) {
      try {
        return await sender.send(phone);
      } catch (err) {
        lastError = err;
        this.log.warn({ err, sender: sender.name }, "OTP sender failed, trying next");
      }
    }
    throw lastError;
  }
}
