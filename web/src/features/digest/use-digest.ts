"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import type { Watchlist } from "@/lib/api/types";
import { watchlistsKey } from "@/features/watchlist/use-watchlists";

export interface DigestOptions {
  /** ISO instant to compare against instead of the saved checkpoint. */
  since?: string;
}

export function useDigest(watchlistId: string | null, opts: DigestOptions) {
  return useQuery({
    queryKey: ["digest", watchlistId, opts.since ?? "checkpoint"],
    queryFn: async () =>
      (await unwrap(api.GET("/v1/watchlists/{watchlistId}/digest", { params: { path: { watchlistId: watchlistId! }, query: opts } }))).digest,
    enabled: !!watchlistId,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/**
 * Record that the user looked. Fired automatically by the catch‑up.
 * The server coalesces views from the same sitting and ignores them when
 * resolving "since", so recording a visit never changes what this visit shows
 * — which is why there is deliberately no digest invalidation here.
 */
export function useRecordVisit(watchlistId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!watchlistId) throw new Error("no watchlist to record a visit for");
      return unwrap(api.POST("/v1/watchlists/{watchlistId}/digest/seen", { params: { path: { watchlistId } } }));
    },
    onSuccess: ({ seenAt }) => {
      qc.setQueryData<Watchlist[]>(watchlistsKey, (prev) => prev?.map((w) => (w.id === watchlistId ? { ...w, lastSeenAt: seenAt } : w)));
    },
  });
}

export function useSpeechStatus() {
  return useQuery({
    queryKey: ["speech-status"],
    queryFn: () => unwrap(api.GET("/v1/speech/status")),
    staleTime: Infinity,
  });
}
