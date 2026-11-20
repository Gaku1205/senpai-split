"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ResultView } from "@/components/ResultView";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { decodeState, encodeState, paramsToRecord } from "@/lib/split";

/** アドレスの値をブラウザで読んで、内訳ページの中身を出す */
export function ResultPageView() {
  const searchParams = useSearchParams();
  const state = decodeState(paramsToRecord(searchParams));
  return (
    <>
      <SiteHeader>
        <Link href={`/?${encodeState(state)}`}>計算し直す</Link>
      </SiteHeader>
      <main className="page">
        <ResultView state={state} />
      </main>
      <SiteFooter />
    </>
  );
}
