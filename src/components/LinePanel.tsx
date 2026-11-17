"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Props {
  text: string;
  organizer: string;
  onOrganizer: (v: string) => void;
  resultHref: string;
  ready: boolean;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

/** LINE に貼る文面：墨色の面に白い吹き出し */
export function LinePanel({ text, organizer, onOrganizer, resultHref, ready }: Props) {
  const [copied, setCopied] = useState(false);
  // 内訳の URL の行は、吹き出しの中では1行に縮めて見せる（コピーするのは全文）
  const m = text.match(/^([\s\S]*\n)(内訳：\S+)$/);
  const body = m ? m[1] : text;
  const link = m ? m[2] : null;
  const timer = useRef<number | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  // スマホの下に貼りつくコピーのボタンは、文面の欄まで来たら隠す（欄の中のボタン・下の欄と重ねない）
  const [panelInView, setPanelInView] = useState(false);
  useEffect(() => {
    const el = panel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setPanelInView(entry.isIntersecting || entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onCopy = async () => {
    const ok = await copyText(text);
    if (!ok) return;
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="line" aria-labelledby="line-title">
      <div className="line-inner" ref={panel}>
        <h2 id="line-title" className="line-title">LINEに貼る文面</h2>
        <label className="line-organizer">
          <span>幹事の名前</span>
          <input value={organizer} onChange={(e) => onOrganizer(e.target.value)} placeholder="名前" />
        </label>
        <div className="talk">
          <p className="talk-from">{organizer.trim() || "幹事"}</p>
          <pre className="bubble" aria-label="文面の中身">
            {body}
            {link ? <span className="bubble-url">{link}</span> : null}
          </pre>
        </div>
        <div className="line-actions">
          <button type="button" className="copy" onClick={onCopy} disabled={!ready}>
            <span aria-live="polite">{copied ? "コピーしました" : "文面をコピー"}</span>
          </button>
          <Link href={resultHref} className="line-link">
            受け取る人の内訳ページを見る
          </Link>
        </div>
      </div>
      <div className={`dock${panelInView ? " is-hidden" : ""}`}>
        <button type="button" className="copy" onClick={onCopy} disabled={!ready} tabIndex={panelInView ? -1 : 0}>
          {copied ? "コピーしました" : "文面をコピー"}
        </button>
      </div>
    </section>
  );
}
