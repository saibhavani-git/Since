import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { AuthShowcase } from "./auth-showcase";

/**
 * Awake auth: the form floats as a white card on the blue→yellow glow; on
 * large screens the left half belongs to the showcase — investor quotes on
 * ink, and the product's own pastel tiles beneath.
 */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="hero-glow flex min-h-dvh flex-col overflow-x-clip">
      <main className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <Wordmark />
          <Link
            href="/"
            className="rounded-full border border-ink/15 bg-white/60 px-4 py-2 text-[13px] font-medium text-text-2 backdrop-blur transition-colors hover:border-ink hover:text-text"
          >
            About Since
          </Link>
        </header>
        <div className="grid flex-1 items-stretch justify-center gap-6 py-10 lg:grid-cols-[minmax(0,520px)_minmax(0,480px)] lg:justify-center xl:gap-10">
          <AuthShowcase className="hidden lg:flex" />
          <div className="flex w-full max-w-[480px] items-center justify-self-center">
            <div className="w-full rounded-[28px] border border-line bg-white px-6 py-10 shadow-float sm:px-12 sm:py-14">
              {children}
            </div>
          </div>
        </div>
        <footer className="text-center text-[12px] text-text-3">Market data is delayed. Not investment advice.</footer>
      </main>
    </div>
  );
}
