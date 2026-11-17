import { PRESETS, computeSplit, yen, type SavedState } from "@/lib/split";
import { tierFill } from "./tierColors";

interface Props {
  state: SavedState;
  onPick: (ratio: number) => void;
}

/** 傾斜の目安：同じ会計を5種の坂で計算し、同じ床の上に並べる。坂そのものを押すと、その傾斜になる */
export function PresetTable({ state, onPick }: Props) {
  const people = state.counts.reduce((a, b) => a + b, 0);
  const results = PRESETS.map((p) => computeSplit({ ...state, ratio: p.ratio }));
  // 5本の坂を同じ高さの物差しで描く（傾きの違いを見比べられるように）
  const max = Math.max(1, ...results.flatMap((r) => r.shares.map((s) => s.each)));
  const nowName = PRESETS.find((p) => Math.abs(state.ratio - p.ratio) < 0.05)?.name ?? "自分で決めた";

  return (
    <section className="presets" id="presets" aria-labelledby="presets-title">
      <div className="presets-head">
        <div>
          <h2 id="presets-title" className="section-title">傾斜の目安</h2>
          <p className="presets-lead">
            いまの会計（{yen(state.total)}・{people}人）を、5種の坂で分けた場合です。坂を押すと、その傾斜になります。
          </p>
        </div>
        <p className="presets-now">
          <span>いまの傾斜</span>
          <strong>
            {nowName} {state.ratio.toFixed(1)}倍
          </strong>
        </p>
      </div>
      <ul className="preset-list" role="group" aria-label="傾斜の目安を選ぶ">
        {PRESETS.map((p, k) => {
          const r = results[k];
          const top = r.shares[0];
          const bottom = r.shares[r.shares.length - 1];
          const current = Math.abs(state.ratio - p.ratio) < 0.05;
          return (
            <li key={p.name}>
              <button
                type="button"
                className={`preset${current ? " is-current" : ""}`}
                aria-pressed={current}
                onClick={() => onPick(p.ratio)}
              >
                <span className="preset-money">
                  {top && bottom && r.shares.length > 1 ? (
                    <>
                      <span>
                        <small>{top.tier}</small>
                        {yen(top.each)}
                      </span>
                      <span>
                        <small>{bottom.tier}</small>
                        {yen(bottom.each)}
                      </span>
                    </>
                  ) : (
                    <span>
                      <small>全員</small>
                      {top ? yen(top.each) : "—"}
                    </span>
                  )}
                </span>
                <span className="preset-plot" aria-hidden="true">
                  {r.shares.map((s) => (
                    <span
                      key={s.index}
                      style={{ height: `${Math.max(4, (s.each / max) * 100)}%`, background: tierFill(s.index), flexGrow: s.count }}
                    />
                  ))}
                </span>
                <span className="preset-name">
                  <strong>{p.name}</strong>
                  <span>
                    {p.ratio.toFixed(1)}倍・{p.note}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
