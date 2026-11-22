"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { loadSaved, saveState } from "@/lib/storage";
import {
  MAX_NAME_LENGTH,
  MAX_RATIO,
  MIN_RATIO,
  sanitizeNames,
  PRESETS,
  TIERS,
  UNITS,
  buildLineText,
  MAX_DISCOUNT,
  MIN_DISCOUNT,
  clampDiscount,
  clampRatio,
  computeSplit,
  encodeState,
  parseYen,
  roundingHead,
  roundingNote,
  tierBigEach,
  yen,
  type Rounding,
  type SavedState,
  type Unit,
} from "@/lib/split";
import { SlopeChart } from "./SlopeChart";
import { LinePanel } from "./LinePanel";
import { PresetTable } from "./PresetTable";
import { tierFill } from "./tierColors";

const noop = () => () => {};
const useOrigin = () =>
  useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );

export function SplitApp({ initial }: { initial: SavedState }) {
  const [state, setState] = useState<SavedState>(initial);
  const [totalText, setTotalText] = useState(initial.total ? initial.total.toLocaleString("ja-JP") : "");
  const origin = useOrigin();
  // null：まだ決めていない／"local"：端末に覚える／"url"：URL の会計を開いた（覚えない）
  const memory = useRef<"local" | "url" | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("t")) {
      memory.current = "url";
      return;
    }
    memory.current = "local";
    const saved = loadSaved();
    if (!saved) return;
    // マウント後に戻す（サーバー描画との食い違いを出さない）
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setState(saved);
      setTotalText(saved.total ? saved.total.toLocaleString("ja-JP") : "");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // URL の会計（"url"）のときは保存しない。戻す値は上の effect が読み済みで、次の描画で同じ値が保存される
    if (memory.current === "local") saveState(state);
  }, [state]);

  const result = useMemo(() => computeSplit(state), [state]);
  const names = useMemo(() => sanitizeNames(state.names), [state.names]);
  const query = encodeState(state);
  const url = origin ? `${origin}/r?${query}` : undefined;
  const text = useMemo(() => buildLineText({ ...state, url }), [state, url]);

  const set = (patch: Partial<SavedState>) => setState((s) => ({ ...s, ...patch }));
  const setRatio = (r: number) => set({ ratio: clampRatio(r) });
  const setCount = (i: number, delta: number) =>
    setState((s) => {
      const counts = s.counts.map((c, j) => (j === i ? Math.min(99, Math.max(0, c + delta)) : c));
      // 人数を減らして超えたら、飲まない人も減らす
      return { ...s, counts, abstainers: s.abstainers.map((a, j) => Math.min(a, counts[j])) };
    });
  const setAbstain = (i: number, delta: number) =>
    setState((s) => ({
      ...s,
      abstainers: s.abstainers.map((a, j) => (j === i ? Math.min(s.counts[j], Math.max(0, a + delta)) : a)),
    }));
  const setName = (i: number, name: string) =>
    setState((s) => ({ ...s, names: TIERS.map((_, j) => (j === i ? name : (s.names[j] ?? ""))) }));
  const setDiscount =(delta: number) => set({ discount: clampDiscount(state.discount + delta) });
  const hasAbstainers = state.abstainers.some((a) => a > 0);

  const shareOf = (i: number) => result.shares.find((s) => s.index === i);
  const top = result.shares[0];
  const bottom = result.shares[result.shares.length - 1];

  return (
    <div className="app-grid">
      <div className="app-top">
      <section className="calc" aria-labelledby="calc-title">
        <div className="calc-head">
          <h1 id="calc-title" className="screen-title">お会計</h1>
          <label className="field-title">
            <span className="sr-only">会の名前</span>
            <input
              value={state.title}
              onChange={(e) => set({ title: e.target.value.slice(0, 30) })}
              placeholder="会の名前（忘年会など）"
              aria-label="会の名前"
            />
          </label>
        </div>

        <label className="total">
          <span className="total-label">合計金額</span>
          <span className="total-row">
            <input
              className="total-input"
              inputMode="numeric"
              autoComplete="off"
              value={totalText}
              placeholder="0"
              aria-label="合計金額（円）"
              onChange={(e) => {
                const n = parseYen(e.target.value);
                setTotalText(n ? n.toLocaleString("ja-JP") : "");
                set({ total: n });
              }}
            />
            <span className="total-yen">円</span>
            <span className="total-people">{result.people}人</span>
          </span>
        </label>

        <SlopeChart
          result={result}
          ratio={state.ratio}
          onRatio={setRatio}
          emptyText={result.people === 0 ? "人数を入れると、坂ができます" : "合計金額を入れると、坂ができます"}
        />

        <div className="tilt">
          <div className="tilt-read">
            <p className="tilt-figure">
              <span className="tilt-num">{state.ratio.toFixed(1)}</span>
              <span className="tilt-unit">倍</span>
            </p>
            <p className="tilt-say">
              {result.shares.length > 1 && top && bottom
                ? `${top.tier}は${bottom.tier}の${state.ratio.toFixed(1)}倍を払う`
                : "区分が2つ以上で、傾斜がつきます"}
            </p>
          </div>
          <label className="tilt-range">
            <span className="sr-only">傾斜（いちばん上の区分が、いちばん下の区分の何倍を払うか）</span>
            <input
              type="range"
              min={MIN_RATIO}
              max={MAX_RATIO}
              step={0.1}
              value={state.ratio}
              onChange={(e) => setRatio(Number(e.target.value))}
            />
            <span className="tilt-ends" aria-hidden="true">
              <span>平等</span>
              <span>3倍</span>
            </span>
          </label>
          <div className="ticks" role="group" aria-label="傾斜の目安">
            {PRESETS.map((p) => {
              const r = computeSplit({ ...state, ratio: p.ratio });
              const tmax = Math.max(1, ...r.shares.map((x) => x.each));
              return (
                <button
                  key={p.name}
                  type="button"
                  className="tick"
                  aria-pressed={Math.abs(state.ratio - p.ratio) < 0.05}
                  onClick={() => setRatio(p.ratio)}
                >
                  <span className="tick-plot" aria-hidden="true">
                    {r.shares.map((x) => (
                      <span key={x.index} style={{ height: `${Math.max(10, (x.each / tmax) * 100)}%`, background: tierFill(x.index), flexGrow: x.count }} />
                    ))}
                  </span>
                  <span className="tick-name">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="tiers" role="group" aria-labelledby="tiers-title">
          <h2 id="tiers-title" className="block-title">区分と人数</h2>
          <ul className="tier-list">
            {TIERS.map((initialName, i) => {
              const share = shareOf(i);
              const count = state.counts[i];
              const abstain = state.abstainers[i];
              const tier = names[i];
              // 全員が飲まないときは飲まない人の1人分（実際に払う金額）を大きく出す
              const big = share ? tierBigEach(share) : 0;
              const typed = Array.from(state.names[i] ?? "").length;
              return (
                <li key={i} className={`tier-row${count === 0 ? " is-zero" : ""}`}>
                  <input
                    className="tier-tile tier-name"
                    style={{ background: tierFill(i), width: `calc(${Math.max(typed, Array.from(tier).length)}em + 24px)` }}
                    value={state.names[i] ?? ""}
                    placeholder={initialName}
                    autoComplete="off"
                    aria-label={`${initialName}の名前`}
                    onChange={(e) => setName(i, Array.from(e.target.value).slice(0, MAX_NAME_LENGTH).join(""))}
                    onBlur={() => setName(i, tier)}
                  />
                  <span className="stepper">
                    <button type="button" onClick={() => setCount(i, -1)} disabled={count === 0} aria-label={`${tier}を1人へらす`}>
                      −
                    </button>
                    <output aria-live="polite" aria-label={`${tier}の人数`}>
                      {count}
                      <small>人</small>
                    </output>
                    <button type="button" onClick={() => setCount(i, 1)} disabled={count >= 99} aria-label={`${tier}を1人ふやす`}>
                      ＋
                    </button>
                  </span>
                  <span className="tier-money">
                    <span className="tier-each">{big > 0 ? yen(big) : "—"}</span>
                    <span className="tier-sub">{share && count > 1 && share.each > 0 ? `${count}人で ${yen(share.subtotal)}` : count === 0 ? "来ていない" : "1人分"}</span>
                  </span>
                  {count > 0 ? (
                    <span className="tier-abstain">
                      <span className="tier-abstain-label">うち飲まない人</span>
                      <span className="stepper">
                        <button type="button" onClick={() => setAbstain(i, -1)} disabled={abstain === 0} aria-label={`${tier}の飲まない人を1人へらす`}>
                          −
                        </button>
                        <output aria-live="polite" aria-label={`${tier}の飲まない人`}>
                          {abstain}
                          <small>人</small>
                        </output>
                        <button type="button" onClick={() => setAbstain(i, 1)} disabled={abstain >= count} aria-label={`${tier}の飲まない人を1人ふやす`}>
                          ＋
                        </button>
                      </span>
                      <span className="tier-each-abstain">{abstain > 0 && abstain < count && share ? yen(share.eachAbstain) : ""}</span>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {hasAbstainers ? (
            <div className="discount">
              <p className="tilt-say">飲まない人は {Math.round(state.discount * 100)}% 引き</p>
              <span className="stepper">
                <button type="button" onClick={() => setDiscount(-0.1)} disabled={state.discount <= MIN_DISCOUNT} aria-label="割引率を10%へらす">
                  −
                </button>
                <output aria-live="polite" aria-label="飲まない人の割引率">
                  {Math.round(state.discount * 100)}
                  <small>%</small>
                </output>
                <button type="button" onClick={() => setDiscount(0.1)} disabled={state.discount >= MAX_DISCOUNT} aria-label="割引率を10%ふやす">
                  ＋
                </button>
              </span>
            </div>
          ) : null}
        </div>

        <div className="rounding">
          <h2 className="block-title">端数</h2>
          <div className="seg" role="radiogroup" aria-label="切りの良い単位">
            {UNITS.map((u) => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={state.unit === u}
                onClick={() => set({ unit: u as Unit })}
              >
                {u.toLocaleString("ja-JP")}円
              </button>
            ))}
          </div>
          <div className="seg" role="radiogroup" aria-label="端数の持ち方">
            {(
              [
                ["up", "切り上げて余りを出す"],
                ["top", "上の区分が持つ"],
              ] as [Rounding, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={state.rounding === m}
                onClick={() => set({ rounding: m })}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="rounding-head">{roundingHead(result, state.rounding)}</p>
          <dl className="sums">
            <div>
              <dt>会計</dt>
              <dd>{yen(state.total)}</dd>
            </div>
            <div>
              <dt>集まる</dt>
              <dd>{yen(result.collected)}</dd>
            </div>
            <div className={result.diff < 0 ? "is-short" : undefined}>
              <dt>{result.diff < 0 ? "足りない" : "余り"}</dt>
              <dd>{yen(Math.abs(result.diff))}</dd>
            </div>
          </dl>
          <p className="rounding-note">{result.people > 0 && state.total > 0 ? roundingNote(result, state.unit, state.rounding) : "　"}</p>
        </div>
      </section>

      <LinePanel
        text={text}
        organizer={state.organizer}
        onOrganizer={(v) => set({ organizer: v.slice(0, 20) })}
        resultHref={`/r?${query}`}
        ready={result.people > 0 && state.total > 0}
      />
      </div>

      <PresetTable state={state} onPick={setRatio} />
    </div>
  );
}
