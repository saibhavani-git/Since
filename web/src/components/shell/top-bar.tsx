"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { IconLogout, IconPlus, IconSearch } from "@/components/ui/icons";
import { useLogout } from "@/features/auth/use-session";
import { useMarketStatus } from "@/features/market/use-market";
import { useAddStock } from "@/features/watchlist/add-stock-provider";
import type { AuthUser } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { initials } from "@/lib/format";

const nav = [
  { href: "/catch-up", label: "Catch up" },
  { href: "/watchlist", label: "Watchlist" },
];

const phaseLabel: Record<string, string> = {
  pre_open: "Pre-open",
  open: "Market open",
  post_close: "Market closed",
  closed_weekend: "Weekend",
  closed_holiday: "Holiday",
};

export function TopBar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const { open } = useAddStock();
  const status = useMarketStatus();

  return (
    <header className="sticky top-0 z-30 w-full pt-3">
      <div className="mx-auto w-full max-w-[1160px] px-3 sm:px-5">
        {/* relative z-10: keeps the account menu above the mobile tab row below (both blur layers form stacking contexts, and DOM order would otherwise win). */}
        <div className="relative z-10 flex h-16 items-center gap-6 rounded-full border border-line bg-white/90 px-5 shadow-card backdrop-blur-md sm:px-6">
          <Wordmark href="/catch-up" />
          <nav className="hidden sm:flex items-center rounded-full bg-ink/5 p-1" aria-label="Primary">
            {nav.map((n) => {
              const active = pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors",
                    active ? "bg-ink text-white" : "text-text-2 hover:bg-white hover:text-text",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {status.data ? (
              <span className="hidden md:inline-flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1.5 text-[12px] text-text-2">
                <span className={cx("size-1.5 rounded-full", status.data.phase === "open" ? "bg-rise" : "bg-market")} />
                {phaseLabel[status.data.phase] ?? status.data.phase}
                {status.data.holidayName ? ` · ${status.data.holidayName}` : ""}
              </span>
            ) : null}
            <button
              onClick={() => open()}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line-2 bg-surface pl-3.5 pr-2.5 text-[13px] text-text-2 transition-colors hover:border-ink hover:text-text"
              aria-label="Add a stock"
            >
              <IconSearch width={16} height={16} />
              <span className="hidden sm:inline">Add a stock</span>
              <IconPlus width={16} height={16} className="sm:hidden" />
              <kbd className="hidden sm:inline-flex h-5 items-center rounded-full bg-canvas-2 px-1.5 font-mono text-[10px] text-text-3">⌘K</kbd>
            </button>
            <UserMenu user={user} />
          </div>
        </div>
        <nav className="sm:hidden mt-2 flex rounded-full border border-line bg-white/90 p-1 shadow-card backdrop-blur-md" aria-label="Primary">
          {nav.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cx("flex-1 rounded-full py-2 text-center text-[13px] font-medium transition-colors", active ? "bg-ink text-white" : "text-text-2")}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function UserMenu({ user }: { user: AuthUser }) {
  const [openMenu, setOpenMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const logout = useLogout();

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpenMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenMenu(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpenMenu((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={openMenu}
        aria-label="Account"
        className="flex size-9 items-center justify-center rounded-full bg-ink text-[12px] font-medium text-white"
      >
        {initials(user.name)}
      </button>
      {openMenu ? (
        <div role="menu" className="absolute right-0 top-11 w-64 rounded-[20px] border border-line bg-surface p-2 shadow-float">
          <div className="px-3 py-2">
            <p className="text-[14px] font-medium">{user.name}</p>
            <p className="text-[12px] text-text-3 num">{user.phone?.replace("+91", "+91 ")}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <button
            role="menuitem"
            onClick={() => logout.mutate()}
            className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[14px] text-text-2 hover:bg-canvas hover:text-text"
          >
            <IconLogout width={16} height={16} /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
