import type { Metadata, Viewport } from "next";
import { Inter_Tight, Instrument_Serif, Noto_Sans_Devanagari } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { Providers } from "./providers";
import "./globals.css";

/** Inter Tight carries the page; Instrument Serif italic carries the accent words; mono for tickers and figures. */
const interTight = Inter_Tight({ subsets: ["latin"], weight: "variable", style: ["normal", "italic"], variable: "--font-inter-tight", display: "swap" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument-serif", display: "swap" });
/** Hindi glyphs fall through to this; Latin never reaches it. */
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: "variable", variable: "--font-devanagari", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Since — what changed while you were away", template: "%s · Since" },
  description: "A watchlist that answers one question: what happened since I last looked? Ranked by how much it matters to you.",
  icons: { icon: "/mark.svg" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${interTight.variable} ${instrumentSerif.variable} ${devanagari.variable} ${GeistMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
