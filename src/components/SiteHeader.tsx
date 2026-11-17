import Link from "next/link";
import { Mark } from "./Mark";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="senpai-split 計算の画面へ">
        <Mark size={30} />
        <span className="brand-name">senpai-split</span>
      </Link>
      <span className="brand-what">先輩・後輩の傾斜つき割り勘</span>
      {children ? <nav className="header-nav" aria-label="ページ内">{children}</nav> : null}
    </header>
  );
}
