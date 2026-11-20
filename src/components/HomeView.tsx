"use client";

import { useSearchParams } from "next/navigation";
import { SplitApp } from "@/components/SplitApp";
import { decodeState, paramsToRecord } from "@/lib/split";

/** アドレスの値をブラウザで読んで、割り勘の初期値にする */
export function HomeView() {
  const searchParams = useSearchParams();
  const initial = decodeState(paramsToRecord(searchParams));
  return <SplitApp initial={initial} />;
}
