import type { Source } from "@/lib/api/types";
import { cx } from "@/lib/cx";

/**
 * Renders prose whose `[n]` markers cite `sources[n-1]`. Each marker becomes
 * a small numbered link to the filing or article — the claim stays traceable.
 */
export function Cited({ text, sources, className, onInk = false }: { text: string; sources: Source[]; className?: string; onInk?: boolean }) {
  // "…assessment [1]." → the marker hugs the word; punctuation follows without a gap.
  const parts = text.replace(/\s+(\[\d+\])/g, "$1").split(/(\[\d+\])/g);
  return (
    <p className={className}>
      {parts.map((part, i) => {
        const m = /^\[(\d+)\]$/.exec(part);
        if (!m) return <span key={i}>{part}</span>;
        const n = Number(m[1]);
        const src = sources[n - 1];
        if (!src) return null;
        return (
          <a
            key={i}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${src.source}: ${src.title}`}
            className={cx(
              "relative -top-[0.5em] inline-block rounded-[3px] px-[1px] text-[0.64em] font-semibold leading-none no-underline transition-colors",
              onInk ? "text-iris-on-ink hover:bg-white/10" : "text-iris-strong hover:bg-iris-tint",
            )}
          >
            {n}
          </a>
        );
      })}
    </p>
  );
}
