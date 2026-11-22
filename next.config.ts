import type { NextConfig } from "next";

// GitHub Pages に置く（サーバーの要らない静的な書き出し）。
// 公開のビルドだけ PAGES_BASE_PATH=/<リポジトリ名> が付く（pipeline.json の deploy の build）。手元と CI では空（直下）。決まった形でない値は使わない
const raw = process.env.PAGES_BASE_PATH ?? "";
const basePath = /^\/[A-Za-z0-9._-]+$/.test(raw) ? raw : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(basePath ? { basePath } : {}),
  // next/image の文字の src（"/photos/a.jpg"）と素の <a> には階層が自動で付かない。前に NEXT_PUBLIC_BASE_PATH を付けて使う
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
