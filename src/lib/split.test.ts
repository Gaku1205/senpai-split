import { describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  buildLineText,
  computeSplit,
  decodeState,
  encodeState,
  parseYen,
  roundingHead,
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
