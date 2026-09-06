import { SignJWT, jwtVerify } from "jose";
import type { Env } from "../../config/env.js";
import type { Clock } from "../../lib/clock.js";
import { newId } from "../../lib/ids.js";

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshId: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
}

/**
 * Stateless access tokens, stateful refresh tokens (the refresh `jti` is
 * stored hashed so it can be revoked/rotated). HS256 with one secret is
 * enough for a single service; move to RS256 if a second service must
 * verify tokens.
 */
export class TokenService {
  private readonly secret: Uint8Array;

  constructor(
    private readonly env: Env,
    private readonly clock: Clock,
  ) {
    this.secret = new TextEncoder().encode(env.JWT_SECRET);
  }

  async issue(userId: string): Promise<IssuedTokens> {
    const now = this.clock.now();
    const accessExpiresAt = new Date(now.getTime() + this.env.ACCESS_TOKEN_TTL_SECONDS * 1000);
    const refreshExpiresAt = new Date(now.getTime() + this.env.REFRESH_TOKEN_TTL_SECONDS * 1000);
    const refreshId = newId();

    const accessToken = await new SignJWT({ typ: "access" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setIssuedAt(Math.floor(now.getTime() / 1000))
      .setExpirationTime(Math.floor(accessExpiresAt.getTime() / 1000))
      .sign(this.secret);

    const refreshToken = await new SignJWT({ typ: "refresh" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setJti(refreshId)
      .setIssuedAt(Math.floor(now.getTime() / 1000))
      .setExpirationTime(Math.floor(refreshExpiresAt.getTime() / 1000))
      .sign(this.secret);

    return { accessToken, refreshToken, refreshId, accessExpiresAt, refreshExpiresAt };
  }

  /** Returns the user id, or null for anything invalid/expired. */
  async verifyAccess(token: string): Promise<string | null> {
    const payload = await this.verify(token, "access");
    return payload?.sub ?? null;
  }

  async verifyRefresh(token: string): Promise<{ userId: string; refreshId: string } | null> {
    const payload = await this.verify(token, "refresh");
    if (!payload?.sub || !payload.jti) return null;
    return { userId: payload.sub, refreshId: payload.jti };
  }

  private async verify(token: string, typ: "access" | "refresh") {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: ["HS256"],
        currentDate: this.clock.now(),
      });
      return payload.typ === typ ? payload : null;
    } catch {
      return null;
    }
  }
}
