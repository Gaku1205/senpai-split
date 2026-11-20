import type { Metadata } from "next";
import { Suspense } from "react";
import { ResultPageView } from "@/components/ResultPageView";

export const metadata: Metadata = {
  title: "割り勘の内訳｜senpai-split",
};

export default function ResultPage() {
  return (
    <Suspense fallback={null}>
      <ResultPageView />
    </Suspense>
  );
}
