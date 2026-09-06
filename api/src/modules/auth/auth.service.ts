import type { AuthUser, LoginRequest, SignupRequest, UpdateProfileRequest } from "../../contracts/index.js";
import type { Env } from "../../config/env.js";
import type { Clock } from "../../lib/clock.js";
import { ConflictError, NotFoundError, RateLimitedError, UnauthorizedError, ValidationError } from "../../lib/errors.js";
import { sha256 } from "../../lib/ids.js";
import type { OtpSender } from "../../providers/otp/index.js";
import type { PasswordHasher } from "../../providers/password/index.js";
import type { UserRow } from "../../db/schema.js";
import type { AuthRepository } from "./auth.repository.js";
import type { IssuedTokens, TokenService } from "./tokens.js";
import type { WatchlistService } from "../watchlist/watchlist.service.js";

const MAX_OTP_ATTEMPTS = 5;

export interface AuthServiceDeps {
  env: Env;
  clock: Clock;
  repo: AuthRepository;
  tokens: TokenService;
  hasher: PasswordHasher;
  otp: OtpSender;
  watchlists: WatchlistService;
}

/**
 * Sign‑up → OTP → verified; login; refresh rotation; logout.
 * Knows nothing about HTTP: it returns data and tokens, routes set cookies.
 */
export class AuthService {
  constructor(private readonly d: AuthServiceDeps) {}

  async signup(input: SignupRequest): Promise<{ user: AuthUser; devOtp?: string }> {
    const existing = await this.d.repo.findUserByPhone(input.phone);
    if (existing?.verifiedAt) throw new ConflictError("That number already has an account. Sign in instead.");

    const passwordHash = await this.d.hasher.hash(input.password);
    const user = existing
      ? await this.d.repo.updateUser(existing.id, { name: input.name, passwordHash })
      : await this.d.repo.createUser({ phone: input.phone, name: input.name, passwordHash });

    const devOtp = await this.issueOtp(input.phone);
    return { user: toAuthUser(user), ...(devOtp ? { devOtp } : {}) };
  }

  async resendOtp(phone: string): Promise<{ devOtp?: string }> {
    const user = await this.d.repo.findUserByPhone(phone);
    if (!user) throw new NotFoundError("Account");
    if (user.verifiedAt) throw new ConflictError("This number is already verified");
    const devOtp = await this.issueOtp(phone);
    return devOtp ? { devOtp } : {};
  }

  async verifyOtp(phone: string, code: string): Promise<{ user: AuthUser; tokens: IssuedTokens }> {
    const user = await this.d.repo.findUserByPhone(phone);
    if (!user) throw new NotFoundError("Account");

    const otp = await this.d.repo.latestOpenOtp(phone);
    const now = this.d.clock.now();
    if (!otp || otp.expiresAt < now) throw new ValidationError("That code has expired. Ask for a new one.");
    if (otp.attempts >= MAX_OTP_ATTEMPTS) throw new RateLimitedError("Too many wrong codes. Ask for a new one.");

    if (otp.codeHash !== sha256(code)) {
      await this.d.repo.bumpOtpAttempts(otp.id, otp.attempts + 1);
      throw new ValidationError("That code isn't right");
    }

    await this.d.repo.consumeOtp(otp.id, now);
    const verified = user.verifiedAt ? user : await this.d.repo.updateUser(user.id, { verifiedAt: now });
    if (!user.verifiedAt) await this.d.watchlists.ensureDefault(user.id);

    return { user: toAuthUser(verified), tokens: await this.issueSession(user.id) };
  }

  async login(input: LoginRequest): Promise<{ user: AuthUser; tokens: IssuedTokens }> {
    const user = await this.d.repo.findUserByPhone(input.phone);
    // Same error for unknown number and wrong password: don't leak who has an account.
    const ok = user?.passwordHash ? await this.d.hasher.verify(user.passwordHash, input.password) : false;
    if (!user || !ok) throw new UnauthorizedError("That number and password don't match");
    if (!user.verifiedAt) throw new UnauthorizedError("Verify your number first");
    return { user: toAuthUser(user), tokens: await this.issueSession(user.id) };
  }

  /** Rotate: the presented refresh token is revoked and a new pair issued. */
  async refresh(refreshToken: string): Promise<{ user: AuthUser; tokens: IssuedTokens }> {
    const parsed = await this.d.tokens.verifyRefresh(refreshToken);
    if (!parsed) throw new UnauthorizedError("Session expired");

    const stored = await this.d.repo.findRefreshToken(parsed.refreshId);
    const now = this.d.clock.now();
    if (!stored || stored.tokenHash !== sha256(refreshToken) || stored.expiresAt < now) {
      throw new UnauthorizedError("Session expired");
    }
    if (stored.revokedAt) {
      // Reuse of a rotated token means it leaked. Kill every session for the user.
      await this.d.repo.revokeAllRefreshTokens(stored.userId, now);
      throw new UnauthorizedError("Session expired");
    }

    const user = await this.d.repo.findUserById(stored.userId);
    if (!user) throw new UnauthorizedError("Session expired");

    await this.d.repo.revokeRefreshToken(stored.id, now);
    return { user: toAuthUser(user), tokens: await this.issueSession(user.id) };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const parsed = await this.d.tokens.verifyRefresh(refreshToken);
    if (parsed) await this.d.repo.revokeRefreshToken(parsed.refreshId, this.d.clock.now());
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.d.repo.findUserById(userId);
    if (!user) throw new UnauthorizedError();
    return toAuthUser(user);
  }

  async updateProfile(userId: string, patch: UpdateProfileRequest): Promise<AuthUser> {
    const user = await this.d.repo.updateUser(userId, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
    });
    return toAuthUser(user);
  }

  private async issueOtp(phone: string): Promise<string | undefined> {
    const delivery = await this.d.otp.send(phone);
    const expiresAt = new Date(this.d.clock.now().getTime() + this.d.env.OTP_TTL_SECONDS * 1000);
    await this.d.repo.createOtp(phone, sha256(delivery.code), expiresAt);
    return delivery.echoToClient && this.d.env.NODE_ENV !== "production" ? delivery.code : undefined;
  }

  private async issueSession(userId: string): Promise<IssuedTokens> {
    const tokens = await this.d.tokens.issue(userId);
    await this.d.repo.storeRefreshToken({
      id: tokens.refreshId,
      userId,
      tokenHash: sha256(tokens.refreshToken),
      expiresAt: tokens.refreshExpiresAt,
    });
    return tokens;
  }
}

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
