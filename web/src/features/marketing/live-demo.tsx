"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { CompanyLogo } from "@/components/brand/company-logo";
import { companyDisplayName, FocusCard } from "@/features/digest/catch-up-deck";
import type { DigestCard } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { demoCard, demoCardGroww, demoCardNykaa, demoCardSwiggy, demoSince } from "./demo-data";

const settle = [0.16, 1, 0.3, 1] as const;

/** Four companies, four different stories: against the market, with results, a slide, and a buyback. */
const DEMO_CARDS: DigestCard[] = [demoCardGroww, demoCardSwiggy, demoCardNykaa, demoCard];

/**
 * The landing-page demo is the product itself: the real catch-up card on
 * canned data. Visitors switch companies with the same pill rail the app
 * uses; every link inside the card leads to sign-up.
 */
export function LiveDemo() {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const active = DEMO_CARDS[index]!;

  return (
    <div>
      <div className="mb-5 flex justify-center px-1">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 shadow-card [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DEMO_CARDS.map((card, i) => (
            <button
              key={card.symbol}
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={i === index}
              className={cx(
                "flex h-10 shrink-0 items-center gap-2.5 rounded-full px-3 pr-4 text-[13px] font-medium transition-colors",
                i === index ? "bg-ink text-white" : "text-text-2 hover:bg-canvas-2 hover:text-text",
              )}
            >
              <CompanyLogo symbol={card.symbol} name={card.instrument.name} size="sm" className="size-7 rounded-[8px] border-0" />
              {companyDisplayName(card.instrument.name)}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active.symbol}
          initial={reduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -18 }}
          transition={{ duration: 0.38, ease: settle }}
        >
          <FocusCard card={active} since={demoSince} href="/sign-up" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
