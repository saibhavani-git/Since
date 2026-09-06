"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";

/** Words worth keeping while a form gets filled. The last one is our thesis. */
const QUOTES = [
  { text: "Know what you own, and know why you own it.", author: "Peter Lynch" },
  { text: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
  { text: "In the short run the market is a voting machine; in the long run it is a weighing machine.", author: "Benjamin Graham" },
  { text: "The most important quality for an investor is temperament, not intellect.", author: "Warren Buffett" },
];

const QUOTE_MS = 8_000;

/**
 * The left half of the auth pages: an ink card that turns through investor
 * quotes, and the product's own pastel tiles beneath it — the same shapes
 * the catch-up uses, arranged as a welcome.
 */
export function AuthShowcase({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const quote = QUOTES[index]!;

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % QUOTES.length), QUOTE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className={cx("flex-col gap-3", className)} aria-label="Why people use Since">
      {/* the quote — the ink story card */}
      <div className="flex flex-1 flex-col rounded-[28px] bg-ink p-8 text-white">
        <span className="inline-flex h-7 w-fit items-center rounded-full border border-white/20 px-3 text-[10.5px] font-bold uppercase tracking-[0.07em] text-white/80">
          Worth remembering
        </span>
        <div className="my-auto py-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.blockquote
              key={quote.author + index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45 }}
            >
              <p className="display max-w-[20ch] text-balance text-[27px] leading-[1.16] xl:text-[31px]">&ldquo;{quote.text}&rdquo;</p>
              <footer className="mt-5 text-[14px] text-white/60">— {quote.author}</footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>
        <div className="flex gap-1.5" role="tablist" aria-label="Quotes">
          {QUOTES.map((q, i) => (
            <button
              key={q.author + i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Quote ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cx("h-1 rounded-full transition-all duration-300", i === index ? "w-8 bg-white" : "w-4 bg-white/25 hover:bg-white/40")}
            />
          ))}
        </div>
      </div>

      {/* the product's tiles, as a welcome */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[24px] bg-tile-lavender p-6">
          <svg viewBox="0 0 160 56" fill="none" className="h-auto w-full" aria-hidden>
            <path d="M4 42 L32 34 L56 40 L84 22 L112 30 L136 12 L152 18" stroke="#4928fd" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="152" cy="18" r="4.5" fill="#4928fd" />
          </svg>
          <p className="mt-4 text-[10.5px] font-bold uppercase tracking-[0.07em] text-ink/60">While you were away</p>
          <p className="display mt-1 text-[24px] text-ink num">+2.9%</p>
        </div>
        <div className="flex flex-col rounded-[24px] bg-tile-gold p-6">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-ink/60">Your catch-up</p>
          <p className="display mt-1 text-[24px] text-ink">30 seconds</p>
          <p className="mt-auto pt-4 text-[13px] leading-snug text-ink/70">Ranked, cited, and read aloud.</p>
        </div>
      </div>

      {/* the quiet strip — a pill, like the app's own */}
      <div className="flex items-center justify-between gap-4 rounded-full bg-tile-sage px-6 py-3.5">
        <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.07em] text-ink/60">The rest stayed quiet</span>
        <span className="truncate text-[12px] font-medium text-ink/80 num">HDFCBANK +0.6% · TCS −0.3% · INFY +0.2%</span>
      </div>
    </aside>
  );
}
