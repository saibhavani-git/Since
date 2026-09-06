import type { Env } from "../../config/env.js";
import type { Logger } from "../../lib/logger.js";
import { ConsoleOtpSender } from "./console.sender.js";
import { DevFixedOtpSender } from "./dev-fixed.sender.js";
import { FallbackOtpSender } from "./fallback.sender.js";
import { Msg91OtpSender } from "./msg91.sender.js";
import type { OtpSender } from "./ports.js";

export type { OtpSender, OtpDelivery } from "./ports.js";

/**
 * The one place that decides which OTP adapter runs. Everything else depends
 * on the `OtpSender` port.
 */
export function createOtpSender(env: Env, log: Logger): OtpSender {
  switch (env.OTP_SENDER) {
    case "dev_fixed":
      return new DevFixedOtpSender(env.OTP_DEV_CODE);
    case "console":
      return new ConsoleOtpSender(log);
    case "msg91":
      return new FallbackOtpSender([new Msg91OtpSender(env.MSG91_AUTH_KEY ?? "", env.MSG91_TEMPLATE_ID ?? ""), new ConsoleOtpSender(log)], log);
  }
}
