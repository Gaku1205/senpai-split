import { Suspense } from "react";
import { HomeView } from "@/components/HomeView";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <>
      <SiteHeader>
        <a href="#presets">傾斜の目安</a>
      </SiteHeader>
      <main className="page">
        <Suspense fallback={null}>
          <HomeView />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
