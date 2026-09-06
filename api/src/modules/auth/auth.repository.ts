import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { otpCodes, refreshTokens, users, type UserRow } from "../../db/schema.js";

export class AuthRepository {
  constructor(private readonly db: Db) {}

  findUserByPhone(phone: string): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({ where: eq(users.phone, phone) });
  }

  findUserById(id: string): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({ where: eq(users.id, id) });
  }

  async createUser(input: { phone: string; name: string; passwordHash: string }): Promise<UserRow> {
    const [row] = await this.db.insert(users).values(input).returning();
    if (!row) throw new Error("insert returned no row");
    return row;
  }

  async updateUser(
    id: string,
    patch: Partial<Pick<UserRow, "name" | "passwordHash" | "verifiedAt">>,
  ): Promise<UserRow> {
    const [row] = await this.db.update(users).set(patch).where(eq(users.id, id)).returning();
    if (!row) throw new Error("user vanished during update");
    return row;
  }

  async createOtp(phone: string, codeHash: string, expiresAt: Date): Promise<void> {
    await this.db.insert(otpCodes).values({ phone, codeHash, expiresAt });
  }

  latestOpenOtp(phone: string) {
    return this.db.query.otpCodes.findFirst({
      where: and(eq(otpCodes.phone, phone), isNull(otpCodes.consumedAt)),
      orderBy: desc(otpCodes.createdAt),
    });
  }

  async bumpOtpAttempts(id: string, attempts: number): Promise<void> {
    await this.db.update(otpCodes).set({ attempts }).where(eq(otpCodes.id, id));
  }

  async consumeOtp(id: string, at: Date): Promise<void> {
    await this.db.update(otpCodes).set({ consumedAt: at }).where(eq(otpCodes.id, id));
  }

  async storeRefreshToken(input: { id: string; userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.db.insert(refreshTokens).values(input);
  }

  findRefreshToken(id: string) {
    return this.db.query.refreshTokens.findFirst({ where: eq(refreshTokens.id, id) });
  }

  async revokeRefreshToken(id: string, at: Date): Promise<void> {
    await this.db.update(refreshTokens).set({ revokedAt: at }).where(eq(refreshTokens.id, id));
  }

  async revokeAllRefreshTokens(userId: string, at: Date): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: at })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }
}
