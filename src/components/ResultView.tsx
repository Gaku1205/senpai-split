"use client";

import Link from "next/link";
import { useState } from "react";
import { computeSplit, encodeState, roundingHead, roundingNote, yen, type SavedState } from "@/lib/split";
import { SlopeChart } from "./SlopeChart";
import { tierFill } from "./tierColors";

/** 最初に濃く見せる区分：文面を受け取るのは後輩が多いので、後輩（いなければいちばん下の区分） */
function firstPick(indexes: number[]): number | null {
  if (indexes.includes(3)) return 3;
  return indexes.length ? indexes[indexes.length - 1] : null;
}

/** 内訳のページ：文面のURLを開いた人が、坂の上で自分の区分の柱を押して金額を見る */
export function ResultView({ state }: { state: SavedState }) {
  const result = computeSplit(state);
  const [picked, setPicked] = useState<number | null>(() => firstPick(result.shares.map((s) => s.index)));
  const title = state.title.trim() || "飲み会";
  const ready = result.people > 0 && state.total > 0;
  const organizer = state.organizer.trim();

  return (
    <div className="result">
      <section className="result-stage" aria-labelledby="you-title">
        <div className="result-head">
          <h1 id="you-title" className="screen-title">
            {title}の内訳
          </h1>
          <p className="result-meta">
            合計 {yen(state.total)}・{result.people}人
            {result.shares.length > 1 ? `・${result.shares[0].tier}は${result.shares[result.shares.length - 1].tier}の${state.ratio.toFixed(1)}倍` : ""}
          </p>
          {ready ? <p className="result-hint">自分の区分の柱を押すと、金額が大きく出ます</p> : null}
        </div>
        {ready ? (
          <SlopeChart result={result} highlight={picked} onPick={setPicked} size="wide" />
        ) : (
          <>
            <SlopeChart result={result} size="wide" emptyText="この内訳には、金額か人数が入っていません" />
            <p className="result-empty">計算の画面で入れ直してください。</p>
          </>
        )}
      </section>

      <section className="breakdown" aria-labelledby="breakdown-title">
        <div className={ready ? "breakdown-inner" : "breakdown-inner is-empty"}>
          <div className="breakdown-side">
            <h2 id="breakdown-title" className="breakdown-title">区分ごとの金額</h2>
            {ready ? <p className="breakdown-head">{roundingHead(result, state.rounding)}</p> : null}
            {ready ? <p className="breakdown-note">{roundingNote(result, state.unit, state.rounding)}</p> : null}
            {ready ? (
              <p className="breakdown-note">{organizer ? `幹事の${organizer}まで、お願いします。` : "幹事まで、お願いします。"}</p>
            ) : null}
            <Link className="again" href={`/?${encodeState(state)}`}>
              この内容で計算し直す
            </Link>
          </div>
          {ready ? (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">区分</th>
                <th scope="col" className="num">人数</th>
                <th scope="col" className="num">1人分</th>
                <th scope="col" className="num">小計</th>
              </tr>
            </thead>
            <tbody>
              {result.shares.map((s) => (
                <tr key={s.index} className={picked === s.index ? "is-picked" : undefined}>
                  <th scope="row">
                    <span className="tier-tile small" style={{ background: tierFill(s.index) }}>
                      {s.tier}
                    </span>
                  </th>
                  <td className="num">{s.count}人</td>
                  <td className="num strong">
                    {s.abstainers === s.count ? yen(s.eachAbstain) : yen(s.each)}
                    {s.abstainers > 0 && s.abstainers < s.count ? `（飲まない${s.abstainers}人 ${yen(s.eachAbstain)}）` : null}
                  </td>
                  <td className="num">{yen(s.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">集まる</th>
                <td className="num">{result.people}人</td>
                <td />
                <td className="num strong">{yen(result.collected)}</td>
              </tr>
            </tfoot>
          </table>
          ) : null}
        </div>
      </section>
    </div>
  );
}
