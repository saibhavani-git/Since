import { z } from "zod";
import { Id, IsoDateTime } from "./common.js";
import { Instrument, Quote, Symbol } from "./market.js";

/**
 * Why the user is watching a stock. Optional, one tap. This is what makes
 * "meaningful" personal.
 */
export const Thesis = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("target_price"), price: z.number().positive() }),
  z.object({ kind: z.literal("breakout_above"), price: z.number().positive() }),
  z.object({ kind: z.literal("through_results") }),
  z.object({ kind: z.literal("curious") }),
]);
export type Thesis = z.infer<typeof Thesis>;

export const WatchlistItem = z.object({
  id: Id,
  symbol: Symbol,
  instrument: Instrument,
  thesis: Thesis.nullable(),
  addedAt: IsoDateTime,
  /** Price when the user added it — a personal reference level. */
  addedPrice: z.number().nullable(),
  quote: Quote.nullable(),
  /** Last month of closes, oldest first. Empty when candles were unavailable. */
  sparkline: z.array(z.number()),
});
export type WatchlistItem = z.infer<typeof WatchlistItem>;

export const Watchlist = z.object({
  id: Id,
  name: z.string(),
  position: z.number().int(),
  items: z.array(WatchlistItem),
  /** When the user last looked at this list; recorded automatically. */
  lastSeenAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
});
export type Watchlist = z.infer<typeof Watchlist>;

export const CreateWatchlistRequest = z.object({ name: z.string().trim().min(1).max(40) });
export const RenameWatchlistRequest = CreateWatchlistRequest;

export const AddItemRequest = z.object({
  symbol: Symbol,
  thesis: Thesis.nullable().default(null),
});
export type AddItemRequest = z.infer<typeof AddItemRequest>;

export const UpdateItemRequest = z.object({ thesis: Thesis.nullable() });

export const WatchlistsResponse = z.object({ watchlists: z.array(Watchlist) });
export const WatchlistResponse = z.object({ watchlist: Watchlist });

export const WatchlistParams = z.object({ watchlistId: Id });
export const ItemParams = z.object({ watchlistId: Id, itemId: Id });
