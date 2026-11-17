import { describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  buildLineText,
  computeSplit,
  decodeState,
  encodeState,
  parseYen,
  roundingHead,
  sanitizeName,
  sanitizeNames,
  weightsFor,
} from "./split";

describe("weightsFor", () => {
  it("いちばん上が ratio、いちばん下が 1 で、まっすぐ下がる", () => {
    expect(weightsFor(5, 2)).toEqual([2, 1.75, 1.5, 1.25, 1]);
  });
  it("区分が1つなら重みは 1", () => {
    expect(weightsFor(1, 3)).toEqual([1]);
  });
  it("倍率は 1.0〜3.0 に収める", () => {
    expect(weightsFor(2, 9)).toEqual([3, 1]);
    expect(weightsFor(2, 0.2)).toEqual([1, 1]);
  });
});

describe("computeSplit", () => {
  it("忘年会 48,600円・10人・1.6倍を100円単位で切り上げる", () => {
    const r = computeSplit(DEFAULT_STATE);
    expect(r.shares.map((s) => s.each)).toEqual([6000, 5500, 4900, 4300, 3800]);
    expect(r.people).toBe(10);
    expect(r.collected).toBe(49000);
    expect(r.diff).toBe(400);
  });
  it("集まる金額は、区分の小計の合計と一致し、会計を下回らない", () => {
    const r = computeSplit({ ...DEFAULT_STATE, total: 38400, counts: [0, 2, 3, 4, 0], ratio: 2.2, unit: 500 });
    expect(r.collected).toBe(r.shares.reduce((s, t) => s + t.each * t.count, 0));
    expect(r.collected).toBeGreaterThanOrEqual(38400);
  });
  it("端数を上の区分が持つときは、ちょうど会計の金額か少し上になる", () => {
    const r = computeSplit({ ...DEFAULT_STATE, rounding: "top" });
    expect(r.diff).toBeGreaterThanOrEqual(0);
    expect(r.diff).toBeLessThan(r.shares[0].count);
    expect(r.shares.slice(1).every((s) => s.each % 100 === 0)).toBe(true);
  });
  it("平等なら全員同じ金額", () => {
    const r = computeSplit({ ...DEFAULT_STATE, ratio: 1, total: 30000, counts: [0, 0, 6, 0, 0] });
    expect(r.shares).toHaveLength(1);
    expect(r.shares[0].each).toBe(5000);
    expect(r.diff).toBe(0);
  });
  it("人がいない区分は出さない", () => {
    const r = computeSplit({ ...DEFAULT_STATE, counts: [1, 0, 0, 2, 0] });
    expect(r.shares.map((s) => s.tier)).toEqual(["上司", "後輩"]);
  });
  it("合計0円や0人のときは、0円で返す", () => {
    expect(computeSplit({ ...DEFAULT_STATE, total: 0 }).collected).toBe(0);
    const empty = computeSplit({ ...DEFAULT_STATE, counts: [0, 0, 0, 0, 0] });
    expect(empty.shares).toEqual([]);
    expect(empty.people).toBe(0);
  });
});

describe("parseYen", () => {
  it("カンマや全角、円を取り除く", () => {
    expect(parseYen("48,600")).toBe(48600);
    expect(parseYen("４８６００円")).toBe(48600);
    expect(parseYen("")).toBe(0);
  });
});

describe("buildLineText", () => {
  it("区分の行と、端数の決まりと、幹事の名前が入る", () => {
    const text = buildLineText({ ...DEFAULT_STATE, url: "https://senpai-split.vercel.app/r?t=48600" });
    expect(text).toContain("【部署の忘年会】お会計のお知らせ");
    expect(text).toContain("合計 48,600円／10人");
    expect(text).toContain("上司　6,000円");
    expect(text).toContain("先輩　5,500円 ×3人");
    expect(text).toContain("余り400円は二次会に回します。");
    expect(text).toContain("幹事の佐藤まで、お願いします。");
    expect(text).toContain("内訳：https://senpai-split.vercel.app/r?t=48600");
  });
});

describe("encodeState / decodeState", () => {
  it("URL にして読み戻すと同じ中身になる", () => {
    const q = encodeState(DEFAULT_STATE);
    const back = decodeState(Object.fromEntries(new URLSearchParams(q)));
    expect(back).toEqual(DEFAULT_STATE);
  });
  it("壊れた値は既定の値か安全な値になる", () => {
    const s = decodeState({ t: "abc", c: "x-2", r: "99", u: "7", m: "zzz" });
    expect(s.total).toBe(0);
    expect(s.counts).toEqual([0, 2, 0, 0, 0]);
    expect(s.ratio).toBe(3);
    expect(s.unit).toBe(100);
    expect(s.rounding).toBe("up");
  });
});

describe("区分の名前", () => {
  const named = { ...DEFAULT_STATE, names: ["部長", "課長", "同期", "後輩", "新人"] };
  it("直し方：空白を削る・8字まで・空は初期値・足りなければ初期値で埋める", () => {
    expect(sanitizeNames(["  部長 ", "", "あ".repeat(12)])).toEqual(["部長", "先輩", "あ".repeat(8), "後輩", "新人"]);
    expect(sanitizeNames(undefined)).toEqual(["上司", "先輩", "同期", "後輩", "新人"]);
    expect(sanitizeNames(["OB", "OB"]).slice(0, 2)).toEqual(["OB", "OB"]);
    expect(sanitizeName("👨‍👩‍👧x", "上司")).not.toBe("");
  });
  it("computeSplit・端数の文・LINEの文面が変えた名前を使う", () => {
    expect(computeSplit(named).shares[0].tier).toBe("部長");
    expect(roundingHead(computeSplit({ ...named, rounding: "top" }), "top")).toBe("端数は部長が持つ");
    const text = buildLineText(named);
    expect(text).toContain("部長　");
    expect(text).not.toContain("上司");
    expect(computeSplit(DEFAULT_STATE).shares[0].tier).toBe("上司");
  });
  it("URL：すべて初期値なら g を付けない。記号・日本語・8字も往復で同じ", () => {
    expect(new URLSearchParams(encodeState(DEFAULT_STATE)).has("g")).toBe(false);
    const s = { ...DEFAULT_STATE, names: ["部長&課長=", "a,b/c?#%", "あ".repeat(8), "O B", "😀新人"] };
    const back = decodeState(Object.fromEntries(new URLSearchParams(encodeState(s))));
    expect(back.names).toEqual(s.names);
  });
});

describe("roundingHead", () => {
  it("切り上げで余りが出たら「余り〇円は二次会へ」", () => {
    expect(roundingHead(computeSplit(DEFAULT_STATE), "up")).toBe("余り400円は二次会へ");
  });
  it("上の区分が持つときは、その区分の名前", () => {
    expect(roundingHead(computeSplit({ ...DEFAULT_STATE, rounding: "top" }), "top")).toBe("端数は上司が持つ");
  });
  it("人数が0なら、入れてもらう1文", () => {
    expect(roundingHead(computeSplit({ ...DEFAULT_STATE, counts: [0, 0, 0, 0, 0] }), "up")).toBe("金額を入れると、端数が出ます");
  });
});

describe("飲まない人", () => {
  const withAbst = { ...DEFAULT_STATE, counts: [1, 3, 2, 3, 1], abstainers: [0, 1, 0, 2, 0], discount: 0.3 };

  it("飲まない人の1人分は、同じ区分の飲む人より安い", () => {
    const r = computeSplit(withAbst);
    for (const s of r.shares) {
      if (s.abstainers > 0) expect(s.eachAbstain).toBeLessThan(s.each);
      else expect(s.eachAbstain).toBe(s.each);
    }
  });

  it("割引率 0 なら、飲まない人も同じ金額", () => {
    const r = computeSplit({ ...withAbst, discount: 0 });
    for (const s of r.shares) expect(s.eachAbstain).toBe(s.each);
  });

  it("切り上げでも上の区分が持つときでも、会計を下回らず、小計の合計と集まる金額が合う", () => {
    for (const rounding of ["up", "top"] as const) {
      const r = computeSplit({ ...withAbst, rounding });
      expect(r.collected).toBe(r.shares.reduce((s, t) => s + t.subtotal, 0));
      expect(r.collected).toBeGreaterThanOrEqual(withAbst.total);
      expect(r.diff).toBeLessThan(withAbst.total * 0.05);
    }
  });

  it("飲まない人が 0 人のとき、従来と同じ金額と文面", () => {
    const r = computeSplit(DEFAULT_STATE);
    expect(r.shares.map((s) => s.each)).toEqual([6000, 5500, 4900, 4300, 3800]);
    expect(r.collected).toBe(49000);
    expect(buildLineText(DEFAULT_STATE)).not.toContain("飲まない");
  });

  it("人数を超えた飲まない人は、その区分の人数に直す", () => {
    const r = computeSplit({ ...withAbst, abstainers: [5, 0, 0, 9, 0] });
    expect(r.shares[0].abstainers).toBe(1);
    expect(r.shares[3].abstainers).toBe(3);
  });

  it("文面は、飲まない人がいる区分だけ行に足される", () => {
    const text = buildLineText(withAbst);
    const s = computeSplit(withAbst).shares[3];
    expect(text).toContain(`×3人（うち飲まない2人 ${s.eachAbstain.toLocaleString("ja-JP")}円）`);
    expect(text.match(/飲まない/g)).toHaveLength(2);
  });

  it("URL の query に往復し、項目なしは 0 人として読む", () => {
    const q = encodeState(withAbst);
    expect(q).toContain("a=0-1-0-2-0");
    expect(q).toContain("d=30");
    const back = decodeState(Object.fromEntries(new URLSearchParams(q)));
    expect(back.abstainers).toEqual(withAbst.abstainers);
    expect(back.discount).toBe(0.3);
    expect(encodeState(DEFAULT_STATE)).not.toContain("a=");
    expect(decodeState({ t: "48600", c: "1-3-2-3-1" }).abstainers).toEqual([0, 0, 0, 0, 0]);
  });

  it("壊れた query の値は範囲内に直す", () => {
    const d = decodeState({ t: "48600", c: "1-3-2-3-1", a: "9-x--5-1", d: "99" });
    expect(d.abstainers).toEqual([1, 0, 0, 3, 1]);
    expect(d.discount).toBe(0.5);
    expect(decodeState({ t: "48600", c: "1-1-1-1-1", a: "1", d: "abc" }).discount).toBe(0.3);
  });
});
