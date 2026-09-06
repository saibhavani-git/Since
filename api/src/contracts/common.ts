import { z } from "zod";

/** Indian mobile numbers, normalised to E.164 (+91XXXXXXXXXX). */
export const PhoneNumber = z
  .string()
  .trim()
  .transform((raw) => raw.replace(/[\s\-()]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^(\+91)?[6-9]\d{9}$/, "Enter a valid Indian mobile number")
      .transform((n) => (n.startsWith("+91") ? n : `+91${n}`)),
  );
export type PhoneNumber = z.output<typeof PhoneNumber>;

export const IsoDateTime = z.iso.datetime({ offset: true });
export const Id = z.uuid();

/** Standard error envelope for every non‑2xx response. */
export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

/** Attached to anything derived from market data. Stale is a visible state. */
export const Freshness = z.object({
  asOf: IsoDateTime,
  delayedMinutes: z.number().int().nonnegative(),
  stale: z.boolean(),
  source: z.string(),
});
export type Freshness = z.infer<typeof Freshness>;

export const Ok = z.object({ ok: z.literal(true) });
