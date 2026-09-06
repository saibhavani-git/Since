import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

/**
 * Users. Consumer users have a phone + password; partner users are
 * created by a partner and have neither — they are identified through
 * `partner_users`.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone"),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_phone_idx").on(t.phone)],
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("otp_phone_idx").on(t.phone)],
);

/** Refresh tokens are stored hashed and rotated on use. */
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("refresh_user_idx").on(t.userId)],
);

export const instruments = pgTable("instruments", {
  symbol: text("symbol").primaryKey(),
  name: text("name").notNull(),
  exchange: text("exchange").notNull().default("NSE"),
  sector: text("sector"),
  /** Reference price used by the fixture provider; harmless otherwise. */
  basePrice: real("base_price"),
  active: boolean("active").notNull().default(true),
});

export const watchlists = pgTable(
  "watchlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("watchlists_owner_idx").on(t.ownerId)],
);

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    watchlistId: uuid("watchlist_id")
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    symbol: text("symbol")
      .notNull()
      .references(() => instruments.symbol),
    thesis: jsonb("thesis").$type<Record<string, unknown> | null>(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    addedPrice: real("added_price"),
  },
  (t) => [uniqueIndex("items_unique_idx").on(t.watchlistId, t.symbol)],
);

/**
 * "The user looked" checkpoints, recorded automatically with session
 * semantics. The snapshot is symbol → price at the moment of the
 * checkpoint so "price when you left" is exact.
 */
export const checkpoints = pgTable(
  "checkpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    watchlistId: uuid("watchlist_id")
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, number>>().notNull().default(sql`'{}'::jsonb`),
    ...timestamps,
  },
  (t) => [index("checkpoints_watchlist_idx").on(t.watchlistId, t.seenAt)],
);

/** Market data cache. Postgres until load says otherwise. */
export const marketCache = pgTable("market_cache", {
  key: text("key").primaryKey(),
  payload: jsonb("payload").$type<unknown>().notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
});

export const partners = pgTable("partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const partnerUsers = pgTable(
  "partner_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    watchlistId: uuid("watchlist_id")
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    /** Partner-owned labels (their CRM id, segment…). Stored verbatim, echoed back. */
    metadata: jsonb("metadata").$type<Record<string, string>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [uniqueIndex("partner_users_unique_idx").on(t.partnerId, t.externalId)],
);

export type UserRow = typeof users.$inferSelect;
export type WatchlistRow = typeof watchlists.$inferSelect;
export type WatchlistItemRow = typeof watchlistItems.$inferSelect;
export type InstrumentRow = typeof instruments.$inferSelect;
export type CheckpointRow = typeof checkpoints.$inferSelect;
