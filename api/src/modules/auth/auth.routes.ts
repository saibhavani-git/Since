import type { FastifyReply } from "fastify";
import { z } from "zod";
import type { Env } from "../../config/env.js";
import {
  LoginRequest,
  Ok,
  ResendOtpRequest,
  SessionResponse,
  SignupRequest,
  SignupResponse,
  UpdateProfileRequest,
  VerifyOtpRequest,
} from "../../contracts/index.js";
import { ACCESS_COOKIE, REFRESH_COOKIE, requireUser, userId } from "../../http/authenticate.js";
import type { App } from "../../http/app-types.js";
import { UnauthorizedError } from "../../lib/errors.js";
import type { AuthService } from "./auth.service.js";
import type { IssuedTokens } from "./tokens.js";

/**
 * HTTP surface only: parse → call service → set cookies → respond.
 * Sensitive routes carry a tighter rate limit than the global one.
 */
export function registerAuthRoutes(app: App, auth: AuthService, env: Env): void {
  const tight = { rateLimit: { max: 10, timeWindow: "1 minute" } };

  app.post("/v1/auth/signup", {
    schema: { tags: ["auth"], body: SignupRequest, response: { 201: SignupResponse } },
    config: tight,
    handler: async (req, reply) => {
      const result = await auth.signup(req.body);
      return reply.status(201).send(result);
    },
  });

  app.post("/v1/auth/otp/resend", {
    schema: { tags: ["auth"], body: ResendOtpRequest, response: { 200: z.object({ devOtp: z.string().optional() }) } },
    config: tight,
    handler: async (req) => auth.resendOtp(req.body.phone),
  });

  app.post("/v1/auth/otp/verify", {
    schema: { tags: ["auth"], body: VerifyOtpRequest, response: { 200: SessionResponse } },
    config: tight,
    handler: async (req, reply) => {
      const { user, tokens } = await auth.verifyOtp(req.body.phone, req.body.code);
      setSessionCookies(reply, tokens, env);
      return { user };
    },
  });

  app.post("/v1/auth/login", {
    schema: { tags: ["auth"], body: LoginRequest, response: { 200: SessionResponse } },
    config: tight,
    handler: async (req, reply) => {
      const { user, tokens } = await auth.login(req.body);
      setSessionCookies(reply, tokens, env);
      return { user };
    },
  });

  app.post("/v1/auth/refresh", {
    schema: { tags: ["auth"], response: { 200: SessionResponse } },
    handler: async (req, reply) => {
      const token = req.cookies[REFRESH_COOKIE];
      if (!token) throw new UnauthorizedError("Session expired");
      const { user, tokens } = await auth.refresh(token);
      setSessionCookies(reply, tokens, env);
      return { user };
    },
  });

  app.post("/v1/auth/logout", {
    schema: { tags: ["auth"], response: { 200: Ok } },
    handler: async (req, reply) => {
      await auth.logout(req.cookies[REFRESH_COOKIE]);
      clearSessionCookies(reply);
      return { ok: true as const };
    },
  });

  app.get("/v1/auth/me", {
    schema: { tags: ["auth"], security: [{ session: [] }], response: { 200: SessionResponse } },
    preHandler: requireUser,
    handler: async (req) => ({ user: await auth.me(userId(req)) }),
  });

  app.patch("/v1/auth/me", {
    schema: { tags: ["auth"], security: [{ session: [] }], body: UpdateProfileRequest, response: { 200: SessionResponse } },
    preHandler: requireUser,
    handler: async (req) => ({ user: await auth.updateProfile(userId(req), req.body) }),
  });
}

function setSessionCookies(reply: FastifyReply, tokens: IssuedTokens, env: Env): void {
  const base = { httpOnly: true, sameSite: "lax" as const, secure: env.COOKIE_SECURE, path: "/" };
  reply.setCookie(ACCESS_COOKIE, tokens.accessToken, { ...base, expires: tokens.accessExpiresAt });
  reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, { ...base, expires: tokens.refreshExpiresAt, path: "/v1/auth" });
}

function clearSessionCookies(reply: FastifyReply): void {
  reply.clearCookie(ACCESS_COOKIE, { path: "/" });
  reply.clearCookie(REFRESH_COOKIE, { path: "/v1/auth" });
}
