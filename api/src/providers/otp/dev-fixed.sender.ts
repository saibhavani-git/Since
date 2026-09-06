import type { OtpDelivery, OtpSender } from "./ports.js";

/** Always the same code, echoed to the client so the UI can show it. Development only. */
export class DevFixedOtpSender implements OtpSender {
  readonly name = "dev_fixed";
  constructor(private readonly code: string) {}

  async send(): Promise<OtpDelivery> {
    return { code: this.code, echoToClient: true };
  }
}
