import type { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import type { TokenService } from "../modules/auth/tokens.js";
import type { PartnerRepository } from "../modules/partner/partner.repository.js";

/**
 * Who is calling. Resolved once per request by `authenticate`; routes then
 * demand the kind they need with `requireUser` / `requirePartner`.
 */
export type Principal =
  | { kind: "user"; userId: string }
  | { kind: "partner"; partnerId: string; partnerName: string };

declare module "fastify" {
  interface FastifyRequest {
    principal: Principal | null;
  }
}

export const ACCESS_COOKIE = "since_access";
export const REFRESH_COOKIE = "since_refresh";

export interface AuthenticateDeps {
  tokens: TokenService;
  partners: PartnerRepository;
}

/**
 * Order: partner API key (Bearer sk_…) → bearer access JWT → access cookie.
 * Never throws: absence of a principal is a fact, and each route decides
 * whether that is acceptable.
 */
export function createAuthenticate(deps: AuthenticateDeps) {
  return async function authenticate(request: FastifyRequest): Promise<void> {
    request.principal = null;

    const header = request.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;

    if (bearer?.startsWith("sk_")) {
      const partner = await deps.partners.findByKey(bearer);
      if (partner) request.principal = { kind: "partner", partnerId: partner.id, partnerName: partner.name };
      return;
    }

    const token = bearer ?? request.cookies[ACCESS_COOKIE];
    if (!token) return;
    const userId = await deps.tokens.verifyAccess(token);
    if (userId) request.principal = { kind: "user", userId };
  };
}

// Hooks must be async (or call `done`); a sync void hook makes Fastify wait forever.
export async function requireUser(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (request.principal?.kind !== "user") throw new UnauthorizedError();
}

/** A signed-in person or a partner key — whoever they are, they must be someone. */
export async function requireAny(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!request.principal) throw new UnauthorizedError("Sign in or pass an API key");
}

export async function requirePartner(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!request.principal) throw new UnauthorizedError("Missing or invalid API key");
  if (request.principal.kind !== "partner") throw new ForbiddenError("This endpoint is for partner API keys");
}

export function userId(request: FastifyRequest): string {
  if (request.principal?.kind !== "user") throw new UnauthorizedError();
  return request.principal.userId;
}

export function partnerId(request: FastifyRequest): string {
  if (request.principal?.kind !== "partner") throw new UnauthorizedError();
  return request.principal.partnerId;
}
