import { UpstreamError } from "../../lib/errors.js";
import { newOtpCode } from "../../lib/ids.js";
import type { OtpDelivery, OtpSender } from "./ports.js";

/**
 * MSG91 — a common Indian SMS gateway. Shows what a production adapter looks
 * like; the HTTP call is real, the credentials are yours.
 */
export class Msg91OtpSender implements OtpSender {
  readonly name = "msg91";

  constructor(
    private readonly authKey: string,
    private readonly templateId: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(phone: string): Promise<OtpDelivery> {
    const code = newOtpCode();
    const res = await this.fetchImpl("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: { "content-type": "application/json", authkey: this.authKey },
      body: JSON.stringify({ template_id: this.templateId, mobile: phone.replace("+", ""), otp: code }),
    });
    if (!res.ok) throw new UpstreamError("Could not send the OTP right now", { status: res.status });
    return { code, echoToClient: false };
  }
}
