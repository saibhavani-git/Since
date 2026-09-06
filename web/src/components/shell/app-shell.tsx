"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { API_URL } from "@/lib/api/client";
import { useSession } from "@/features/auth/use-session";
import { AddStockProvider } from "@/features/watchlist/add-stock-provider";
import { TopBar } from "./top-bar";
import { ShellSkeleton } from "./shell-skeleton";

/**
 * Signed-in frame. Confirms the session with the API once, then renders the
 * top bar and page. The "add a stock" dialog lives here so every page can
 * open it (⌘K, the + button, empty states).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session.isSuccess && session.data === null) {
      // Clear any stale session cookies first, otherwise the proxy sees them
      // and bounces /sign-in straight back here — an invisible loop.
      void fetch(`${API_URL}/v1/auth/logout`, { method: "POST", credentials: "include" })
        .catch(() => undefined)
        .finally(() => router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`));
    }
  }, [session.isSuccess, session.data, router, pathname]);

  if (!session.data) return <ShellSkeleton />;

  return (
    <AddStockProvider>
      <div className="min-h-dvh flex flex-col">
        <TopBar user={session.data} />
        <main className="mx-auto w-full max-w-[1120px] flex-1 px-5 pb-24 pt-6 sm:px-8 sm:pt-10">{children}</main>
      </div>
    </AddStockProvider>
  );
}
