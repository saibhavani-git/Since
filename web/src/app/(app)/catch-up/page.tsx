import type { Metadata } from "next";
import { Suspense } from "react";
import { CatchUp } from "@/features/digest/catch-up";

export const metadata: Metadata = { title: "Catch up" };

export default function CatchUpPage() {
  return (
    <Suspense>
      <CatchUp />
    </Suspense>
  );
}
