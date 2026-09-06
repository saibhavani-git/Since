/**
 * Domain types derived from the generated OpenAPI schema (`pnpm gen:api`).
 * Nothing here is hand‑written; if the API changes, regenerate and the
 * compiler points at every affected component.
 */
import type { paths } from "./schema";

type Json<T> = T extends { content: { "application/json": infer B } } ? B : never;
type Ok<P extends keyof paths, M extends keyof paths[P], S extends number = 200> =
  paths[P][M] extends { responses: infer R } ? (S extends keyof R ? Json<R[S]> : never) : never;
type Body<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends { requestBody: { content: { "application/json": infer B } } } ? B : never;

export type AuthUser = Ok<"/v1/auth/me", "get">["user"];
export type SignupRequest = Body<"/v1/auth/signup", "post">;
export type LoginRequest = Body<"/v1/auth/login", "post">;

export type Watchlist = Ok<"/v1/watchlists", "get">["watchlists"][number];
export type WatchlistItem = Watchlist["items"][number];
export type Thesis = NonNullable<WatchlistItem["thesis"]>;
export type Instrument = WatchlistItem["instrument"];
export type Quote = NonNullable<WatchlistItem["quote"]>;
export type Freshness = Quote["freshness"];

export type StockDetail = Ok<"/v1/market/stocks/{symbol}", "get">;
export type CandleSeries = Ok<"/v1/market/stocks/{symbol}/candles", "get">;
export type CandleRange = CandleSeries["range"];
export type MarketStatus = Ok<"/v1/market/status", "get">;

export type Digest = Ok<"/v1/watchlists/{watchlistId}/digest", "get">["digest"];
export type DigestCard = Digest["cards"][number];
export type QuietItem = Digest["quiet"][number];
export type Signal = DigestCard["signals"][number];
export type Source = DigestCard["sources"][number];
export type Chip = DigestCard["chips"][number];
export type StoryPoint = DigestCard["story"][number];
export type QuietNote = NonNullable<QuietItem["note"]>;
export type ScriptSegment = Digest["script"][number];
export type Verdict = Digest["verdict"];

export type Report = Ok<"/v1/market/stocks/{symbol}/report", "get">["report"];
export type SpeechStatus = Ok<"/v1/speech/status", "get">;
