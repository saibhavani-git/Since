import type { Logger } from "../../lib/logger.js";
import { newOtpCode } from "../../lib/ids.js";
import type { OtpDelivery, OtpSender } from "./ports.js";

/** A random code, written to the log. Exercises the real flow without SMS. */
export class ConsoleOtpSender implements OtpSender {
  readonly name = "console";
  constructor(private readonly log: Logger) {}

  async send(phone: string): Promise<OtpDelivery> {
    const code = newOtpCode();
    this.log.info({ phone, code }, "OTP");
    return { code, echoToClient: false };
  }
}
