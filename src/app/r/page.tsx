import type { Metadata } from "next";
import { ResultView } from "@/components/ResultView";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { decodeState, encodeState } from "@/lib/split";

export const metadata: Metadata = {
  title: "割り勘の内訳｜senpai-split",
};

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = decodeState(await searchParams);
  return (
    <>
      <SiteHeader>
        <a href={`/?${encodeState(state)}`}>計算し直す</a>
      </SiteHeader>
      <main className="page">
        <ResultView state={state} />
      </main>
      <SiteFooter />
    </>
  );
}
