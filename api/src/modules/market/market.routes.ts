import { z } from "zod";
import { CandleRange, CandleSeries, MarketStatus, SearchQuery, SearchResponse, StockDetail, Symbol } from "../../contracts/index.js";
import type { App } from "../../http/app-types.js";
import type { MarketService } from "./market.service.js";

/** Public, read‑only. Cached upstream, so no auth needed to browse a stock. */
export function registerMarketRoutes(app: App, market: MarketService): void {
  app.get("/v1/market/status", {
    schema: { tags: ["market"], response: { 200: MarketStatus } },
    handler: async () => market.status(),
  });

  app.get("/v1/market/search", {
    schema: { tags: ["market"], querystring: SearchQuery, response: { 200: SearchResponse } },
    handler: async (req) => ({ results: await market.search(req.query.q) }),
  });

  app.get("/v1/market/stocks/:symbol", {
    schema: {
      tags: ["market"],
      params: z.object({ symbol: Symbol }),
      querystring: z.object({ exchange: z.enum(["nse", "both"]).default("nse") }),
      response: { 200: StockDetail },
    },
    handler: async (req) => market.stock(req.params.symbol, req.query.exchange === "both"),
  });

  app.get("/v1/market/stocks/:symbol/candles", {
    schema: {
      tags: ["market"],
      params: z.object({ symbol: Symbol }),
      querystring: z.object({ range: CandleRange.default("3M") }),
      response: { 200: CandleSeries },
    },
    handler: async (req) => {
      await market.instrument(req.params.symbol);
      const { candles, freshness } = await market.candles(req.params.symbol, req.query.range);
      return { symbol: req.params.symbol, range: req.query.range, candles, freshness };
    },
  });
}
