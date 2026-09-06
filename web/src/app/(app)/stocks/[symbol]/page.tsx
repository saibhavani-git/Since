import type { Metadata } from "next";
import { Suspense } from "react";
import { StockView } from "@/features/stock/stock-view";

type Params = Promise<{ symbol: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { symbol } = await params;
  return { title: symbol.toUpperCase() };
}

export default async function StockPage({ params }: { params: Params }) {
  const { symbol } = await params;
  return (
    <Suspense>
      <StockView symbol={symbol.toUpperCase()} />
    </Suspense>
  );
}
