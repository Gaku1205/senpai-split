"use client";

import { useRef } from "react";
import type { SplitResult } from "@/lib/split";
import { clampRatio } from "@/lib/split";
import { tierFill } from "./tierColors";

interface Props {
  result: SplitResult;
  /** 渡すと、柱を上下にドラッグして倍率を変えられる */
  ratio?: number;
  onRatio?: (r: number) => void;
  /** 選んだ区分だけを濃く見せる（内訳のページ） */
  highlight?: number | null;
  /** 渡すと、区分の柱そのものを押して選べる。選んだ柱の上に大きい金額を出す */
  onPick?: (index: number) => void;
  emptyText?: string;
  size?: "large" | "small" | "wide";
}

/** 席順の坂：上座→下座に並ぶ人の柱。頭の高さが1人分の金額 */
export function SlopeChart({ result, ratio, onRatio, highlight = null, onPick, emptyText, size = "large" }: Props) {
  const drag = useRef<{ y: number; r: number } | null>(null);
  const max = Math.max(...result.shares.map((s) => s.each), 0);
  const isEmpty = max === 0;
  const columns = result.shares.length
    ? result.shares.map((s) => `minmax(var(--slope-min), ${s.count}fr)`).join(" ")
    : "1fr";
  const last = result.shares.length - 1;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onRatio || ratio === undefined) return;
    drag.current = { y: e.clientY, r: ratio };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !onRatio) return;
    const dy = drag.current.y - e.clientY;
    onRatio(clampRatio(drag.current.r + dy / 80));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <figure className={`slope slope-${size}${onRatio ? " slope-drag" : ""}${onPick ? " slope-pick" : ""}`}>
      {onPick && !isEmpty ? (
        <div className="slope-callout" style={{ gridTemplateColumns: columns }} aria-live="polite">
          {result.shares.map((s, i) => (
            <div key={s.index} className="slope-callout-cell">
              {highlight === s.index ? (
                <p className={`slope-callout-figure${i === 0 ? " at-start" : i === last ? " at-end" : ""}`}>
                  <span className="slope-callout-tier">{s.tier}のあなた</span>
                  <span className="slope-callout-num">
                    {s.each.toLocaleString("ja-JP")}
                    <small>円</small>
                  </span>
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <div
        className="slope-plot"
        role={onPick ? "radiogroup" : undefined}
        aria-label={onPick ? "あなたの区分（柱を押す）" : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ gridTemplateColumns: columns }}
      >
        {isEmpty ? (
          <p className="slope-empty">{emptyText ?? "合計金額と人数を入れると、坂ができます"}</p>
        ) : (
          result.shares.map((s) => {
            const h = Math.max(s.each / max, 0.06);
            const dim = highlight !== null && highlight !== s.index;
            const inner = (
              <>
                <span className="slope-amount">
                  <span className="slope-num">{s.each.toLocaleString("ja-JP")}</span>
                  <span className="slope-unit">円</span>
                </span>
                <span className="slope-bars" style={{ height: `calc((100% - var(--slope-label)) * ${h.toFixed(4)})` }}>
                  {Array.from({ length: s.count }, (_, i) => (
                    <span
                      key={i}
                      className="slope-bar"
                      style={{ background: onPick && highlight === s.index ? tierFill(0) : tierFill(s.index) }}
                    />
                  ))}
                </span>
              </>
            );
            return onPick ? (
              <button
                key={s.index}
                type="button"
                role="radio"
                aria-checked={highlight === s.index}
                aria-label={`${s.tier}（${s.each.toLocaleString("ja-JP")}円）`}
                className={`slope-group${dim ? " is-dim" : ""}`}
                onClick={() => onPick(s.index)}
              >
                {inner}
              </button>
            ) : (
              <div key={s.index} className={`slope-group${dim ? " is-dim" : ""}`}>
                {inner}
              </div>
            );
          })
        )}
      </div>
      <div className="slope-floor" aria-hidden="true" />
      {!isEmpty ? (
        <div className="slope-names" style={{ gridTemplateColumns: columns }}>
          {result.shares.map((s) => (
            <p key={s.index} className={highlight !== null && highlight !== s.index ? "is-dim" : undefined}>
              <span className="slope-tier">{s.tier}</span>
              <span className="slope-count">{s.count}人</span>
            </p>
          ))}
        </div>
      ) : null}
      <figcaption className="slope-seats">
        <span>上座（奥）</span>
        <span>下座（入口）</span>
      </figcaption>
    </figure>
  );
}
