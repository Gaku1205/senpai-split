import { describe, expect, it } from "vitest";
import { STORAGE_KEY, loadSaved, parseSaved, saveState } from "./storage";
import { DEFAULT_STATE, type SavedState } from "./split";

function memory(initial?: string) {
  const map = new Map<string, string>();
  if (initial !== undefined) map.set(STORAGE_KEY, initial);
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

const sample: SavedState = {
  title: "新歓",
  organizer: "田中",
  total: 120000,
  counts: [0, 2, 5, 10, 4],
  ratio: 2.3,
  unit: 500,
  rounding: "top",
  abstainers: [0, 1, 2, 0, 3],
  discount: 0.4,
};

describe("保存と読み込み", () => {
  it("保存した値がそのまま戻る", () => {
    const s = memory();
    saveState(sample, s);
    expect(loadSaved(s)).toEqual(sample);
  });

  it("何も無いときは null", () => {
    expect(loadSaved(memory())).toBeNull();
    expect(loadSaved(null)).toBeNull();
  });

  it("壊れた JSON や オブジェクトでない物は null", () => {
    expect(parseSaved("{oops")).toBeNull();
    expect(parseSaved("123")).toBeNull();
    expect(parseSaved("null")).toBeNull();
    expect(parseSaved("[1,2]")).toBeNull();
  });

  it("範囲外の値は範囲内に直す", () => {
    const r = parseSaved(
      JSON.stringify({ ...sample, title: "あ".repeat(50), organizer: "い".repeat(40), counts: [-3, 150, 2.9, 1], ratio: 9, unit: 7, total: -5 }),
    );
    expect(r).not.toBeNull();
    expect(r?.title).toHaveLength(30);
    expect(r?.organizer).toHaveLength(20);
    expect(r?.counts).toEqual([0, 99, 2, 1, 0]);
    expect(r?.ratio).toBe(3);
    expect(r?.unit).toBe(100);
    expect(r?.total).toBe(0);
  });

  it("飲まない人と割引率の範囲外は範囲内に直し、項目なしは 0 人として読む", () => {
    const r = parseSaved(JSON.stringify({ ...sample, abstainers: [5, -2, 9, "x", 1.9], discount: 0.9 }));
    expect(r?.abstainers).toEqual([0, 0, 5, 0, 1]);
    expect(r?.discount).toBe(0.5);
    const old = parseSaved(JSON.stringify({ title: "古い", counts: [1, 1, 1, 1, 1] }));
    expect(old?.abstainers).toEqual([0, 0, 0, 0, 0]);
    expect(old?.discount).toBe(0.3);
  });

  it("型の違う値は既定の値にする", () => {
    const r = parseSaved(JSON.stringify({ title: 1, organizer: null, total: "x", counts: "no", ratio: "a", unit: "10", rounding: 3 }));
    expect(r).toEqual({ ...DEFAULT_STATE, unit: 100, rounding: "up" });
  });

  it("localStorage が例外を投げても壊れない", () => {
    const bad = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadSaved(bad)).toBeNull();
    expect(() => saveState(sample, bad)).not.toThrow();
  });
});
