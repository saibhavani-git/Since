"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import { Monogram } from "./monogram";

/** Groww's public stock-logo CDN, keyed by NSE symbol. */
export const logoUrl = (symbol: string) => `https://assets-netstorage.groww.in/stock-assets/logos2/${encodeURIComponent(symbol)}.png`;

const dims = { sm: "size-8 rounded-[12px]", md: "size-10 rounded-[14px]", lg: "size-14 rounded-[20px]", xl: "size-16 rounded-[24px]" } as const;

/**
 * The company's real mark on a white tile, falling back to a monogram when
 * the CDN has none. Same footprint either way, so layouts never shift.
 */
export function CompanyLogo({ symbol, name, size = "md", className }: { symbol: string; name?: string; size?: keyof typeof dims; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Monogram symbol={symbol} name={name} size={size === "xl" ? "lg" : size} className={className} />;
  return (
    <span className={cx("inline-flex shrink-0 items-center justify-center overflow-hidden border border-line bg-white", dims[size], className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- third-party CDN, sized by the tile */}
      <img src={logoUrl(symbol)} alt="" width={64} height={64} loading="lazy" decoding="async" onError={() => setFailed(true)} className="size-[72%] object-contain" />
    </span>
  );
}
