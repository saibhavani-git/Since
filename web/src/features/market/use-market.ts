"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import type { CandleRange } from "@/lib/api/types";

export function useSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: ["search", term.toUpperCase()],
    queryFn: async () => (await unwrap(api.GET("/v1/market/search", { params: { query: { q: term } } }))).results,
    enabled: term.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 10 * 60_000,
  });
}

export function useStock(symbol: string) {
  return useQuery({
    queryKey: ["stock", symbol],
    queryFn: () => unwrap(api.GET("/v1/market/stocks/{symbol}", { params: { path: { symbol }, query: { exchange: "both" } } })),
    staleTime: 30_000,
  });
}

export function useCandles(symbol: string, range: CandleRange) {
  return useQuery({
    queryKey: ["candles", symbol, range],
    queryFn: () => unwrap(api.GET("/v1/market/stocks/{symbol}/candles", { params: { path: { symbol }, query: { range } } })),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

/** Filings and press for one stock over the last week — links only, no prose. */
export function useStockNews(symbol: string) {
  return useQuery({
    queryKey: ["stock-news", symbol],
    queryFn: () => unwrap(api.GET("/v1/market/stocks/{symbol}/news", { params: { path: { symbol } } })),
    staleTime: 5 * 60_000,
  });
}

export function useMarketStatus() {
  return useQuery({
    queryKey: ["market-status"],
    queryFn: () => unwrap(api.GET("/v1/market/status")),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
