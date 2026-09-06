import { z } from "zod";
import { Id, IsoDateTime, PhoneNumber } from "./common.js";

export const Password = z.string().min(8, "Use at least 8 characters").max(128);

export const SignupRequest = z.object({
  phone: PhoneNumber,
  name: z.string().trim().min(1, "Tell us what to call you").max(80),
  password: Password,
});
export type SignupRequest = z.infer<typeof SignupRequest>;

export const VerifyOtpRequest = z.object({
  phone: PhoneNumber,
  code: z.string().regex(/^\d{6}$/, "The code is 6 digits"),
});
export type VerifyOtpRequest = z.infer<typeof VerifyOtpRequest>;

export const ResendOtpRequest = z.object({ phone: PhoneNumber });

export const LoginRequest = z.object({
  phone: PhoneNumber,
  password: z.string().min(1, "Enter your password"),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const AuthUser = z.object({
  id: Id,
  phone: z.string().nullable(),
  name: z.string(),
  verifiedAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
});
export type AuthUser = z.infer<typeof AuthUser>;

export const SignupResponse = z.object({
  user: AuthUser,
  /** Present outside production so the UI can show the code. */
  devOtp: z.string().optional(),
});

export const SessionResponse = z.object({ user: AuthUser });

export const UpdateProfileRequest = z.object({
  name: z.string().trim().min(1).max(80).optional(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>;
