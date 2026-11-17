import type { Metadata, Viewport } from "next";
import { Manrope, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-figure",
  display: "swap",
});

const zen = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ja",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "senpai-split｜先輩・後輩の傾斜つき割り勘",
  description:
    "飲み会の割り勘を、先輩・後輩の傾斜つきで1分で決めて、LINEにそのまま貼れる文面にするWebアプリ。",
};

export const viewport: Viewport = {
  themeColor: "#f3f5f7",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${manrope.variable} ${zen.variable}`}>
      <body>{children}</body>
    </html>
  );
}
