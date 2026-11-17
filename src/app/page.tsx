import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SplitApp } from "@/components/SplitApp";
import { decodeState } from "@/lib/split";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initial = decodeState(await searchParams);
  return (
    <>
      <SiteHeader>
        <a href="#presets">傾斜の目安</a>
      </SiteHeader>
      <main className="page">
        <SplitApp initial={initial} />
      </main>
      <SiteFooter />
    </>
  );
}
