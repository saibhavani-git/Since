"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AddStockDialog } from "./add-stock-dialog";

interface AddStockApi {
  open: (opts?: { symbol?: string }) => void;
  close: () => void;
}

const Ctx = createContext<AddStockApi | null>(null);

/** Hosts the one "add a stock" dialog and the ⌘K shortcut for the whole signed-in app. */
export function AddStockProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; symbol?: string }>({ open: false });
  const open = useCallback((opts?: { symbol?: string }) => setState({ open: true, symbol: opts?.symbol }), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const value = useMemo(() => ({ open, close }), [open, close]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <AddStockDialog open={state.open} initialSymbol={state.symbol} onClose={close} />
    </Ctx.Provider>
  );
}

export function useAddStock(): AddStockApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAddStock must be used inside AddStockProvider");
  return v;
}
