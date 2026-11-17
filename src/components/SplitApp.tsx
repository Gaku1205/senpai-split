"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  MAX_RATIO,
  MIN_RATIO,
  PRESETS,
  TIERS,
  UNITS,
  buildLineText,
  clampRatio,
  computeSplit,
  encodeState,
  parseYen,
  roundingHead,
  roundingNote,
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

  const result = useMemo(() => computeSplit(state), [state]);
  const query = encodeState(state);
  const url = origin ? `${origin}/r?${query}` : undefined;
  const text = useMemo(() => buildLineText({ ...state, url }), [state, url]);

  const set = (patch: Partial<SavedState>) => setState((s) => ({ ...s, ...patch }));
  const setRatio = (r: number) => set({ ratio: clampRatio(r) });
  const setCount = (i: number, delta: number) =>
    setState((s) => ({
      ...s,
      counts: s.counts.map((c, j) => (j === i ? Math.min(99, Math.max(0, c + delta)) : c)),
    }));

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
                      <span key={x.tier} style={{ height: `${Math.max(10, (x.each / tmax) * 100)}%`, background: tierFill(x.index), flexGrow: x.count }} />
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
            {TIERS.map((tier, i) => {
              const share = shareOf(i);
              const count = state.counts[i];
              return (
                <li key={tier} className={`tier-row${count === 0 ? " is-zero" : ""}`}>
                  <span className="tier-tile" style={{ background: tierFill(i) }}>
                    {tier}
                  </span>
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
                    <span className="tier-each">{share && share.each > 0 ? yen(share.each) : "—"}</span>
                    <span className="tier-sub">{share && count > 1 && share.each > 0 ? `${count}人で ${yen(share.subtotal)}` : count === 0 ? "来ていない" : "1人分"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
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
