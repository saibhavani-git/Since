"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import type { Thesis, Watchlist } from "@/lib/api/types";

export const watchlistsKey = ["watchlists"] as const;

export function useWatchlists() {
  return useQuery({
    queryKey: watchlistsKey,
    queryFn: async () => (await unwrap(api.GET("/v1/watchlists"))).watchlists,
    staleTime: 60_000,
  });
}

/** The user's first list. Since keeps one list per person deliberately simple; more lists are an API feature, not a UI one yet. */
export function usePrimaryWatchlist() {
  const q = useWatchlists();
  return { ...q, watchlist: q.data?.[0] ?? null };
}

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: watchlistsKey });
  void qc.invalidateQueries({ queryKey: ["digest"] });
};

export function useCreateWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => unwrap(api.POST("/v1/watchlists", { body: { name } })),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useAddItem(watchlistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { symbol: string; thesis: Thesis | null }) =>
      unwrap(api.POST("/v1/watchlists/{watchlistId}/items", { params: { path: { watchlistId } }, body })),
    onSuccess: ({ watchlist }) => {
      qc.setQueryData<Watchlist[]>(watchlistsKey, (prev) => prev?.map((w) => (w.id === watchlist.id ? watchlist : w)));
      void qc.invalidateQueries({ queryKey: ["digest"] });
    },
  });
}

export function useUpdateItem(watchlistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, thesis }: { itemId: string; thesis: Thesis | null }) =>
      unwrap(api.PATCH("/v1/watchlists/{watchlistId}/items/{itemId}", { params: { path: { watchlistId, itemId } }, body: { thesis } })),
    onSuccess: ({ watchlist }) => {
      qc.setQueryData<Watchlist[]>(watchlistsKey, (prev) => prev?.map((w) => (w.id === watchlist.id ? watchlist : w)));
      void qc.invalidateQueries({ queryKey: ["digest"] });
    },
  });
}

export function useRemoveItem(watchlistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => unwrap(api.DELETE("/v1/watchlists/{watchlistId}/items/{itemId}", { params: { path: { watchlistId, itemId } } })),
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: watchlistsKey });
      const prev = qc.getQueryData<Watchlist[]>(watchlistsKey);
      qc.setQueryData<Watchlist[]>(watchlistsKey, (lists) =>
        lists?.map((w) => (w.id === watchlistId ? { ...w, items: w.items.filter((i) => i.id !== itemId) } : w)),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(watchlistsKey, ctx.prev),
    onSettled: () => invalidateAll(qc),
  });
}
