/**
 * 傾斜つき割り勘の計算。
 * 区分（上司→新人）は席順。上の区分ほど重みが大きく、いちばん上の区分は、いちばん下の区分の ratio 倍を払う。
 * 重みは、人のいる区分だけで、上から下へまっすぐ（線形に）下がる。
 */

/** 区分の初期の名前（上から順）。名前は会に合わせて変えられる */
export const TIERS = ["上司", "先輩", "同期", "後輩", "新人"] as const;
export type TierName = string;

/** 区分の名前の長さの上限（見た目の1文字で数える） */
export const MAX_NAME_LENGTH = 8;

/** 名前を1つ直す：制御文字と前後の空白を削る、8字まで、空なら初期値 */
export function sanitizeName(name: unknown, fallback: string): string {
  if (typeof name !== "string") return fallback;
  const cleaned = name.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  const cut = Array.from(cleaned).slice(0, MAX_NAME_LENGTH).join("").trim();
  return cut === "" ? fallback : cut;
}

/** 5つの名前に直す。足りない・壊れた所は初期値。同じ名前が2つあってもよい */
export function sanitizeNames(names: readonly unknown[] | undefined | null): string[] {
  return TIERS.map((d, i) => sanitizeName(Array.isArray(names) ? names[i] : undefined, d));
}

export function isDefaultNames(names: readonly string[]): boolean {
  return names.every((n, i) => n === TIERS[i]);
}

/** 端数の扱い。up：区分ごとに切り上げ（余りが出る）／top：下の区分は切り捨て、足りない分をいちばん上の区分が持つ */
export type Rounding = "up" | "top";
export type Unit = 10 | 100 | 500 | 1000;

export const UNITS: readonly Unit[] = [10, 100, 500, 1000];
export const MIN_RATIO = 1;
export const MAX_RATIO = 3;
export const MIN_DISCOUNT = 0;
export const MAX_DISCOUNT = 0.5;
export const DEFAULT_DISCOUNT = 0.3;

export interface SplitInput {
  /** 会計の合計（円） */
  total: number;
  /** 区分ごとの人数。TIERS と同じ順・同じ長さ */
  counts: number[];
  /** いちばん上の区分が、いちばん下の区分の何倍を払うか（1.0〜3.0） */
  ratio: number;
  unit: Unit;
  rounding: Rounding;
  /** 区分ごとの「うち飲まない人」の人数。counts と同じ順・長さ（0〜その区分の人数） */
  abstainers: number[];
  /** 飲まない人の割引率（0〜0.5、0.1 刻み）。全体で1つ */
  discount: number;
  /** 区分の名前（上から順に5つ）。無いときは初期値（上司・先輩・同期・後輩・新人） */
  names?: string[];
}

export interface TierShare {
  tier: TierName;
  index: number;
  count: number;
  /** 重み（いちばん下の区分を 1 とする） */
  weight: number;
  /** 1人あたりの金額（円）。飲む人の分 */
  each: number;
  /** その区分の合計（円）。飲まない人を含む */
  subtotal: number;
  /** うち飲まない人の人数 */
  abstainers: number;
  /** 飲まない人の1人分（円）。飲まない人がいないときは each と同じ */
  eachAbstain: number;
  /** 飲まない人の小計（円） */
  subtotalAbstain: number;
}

export interface SplitResult {
  /** 人のいる区分だけ、上から順に */
  shares: TierShare[];
  people: number;
  /** 集まる金額 */
  collected: number;
  /** 集まる金額 − 会計（正なら余り、負なら足りない） */
  diff: number;
  /** いちばん上の区分の1人分 ÷ いちばん下の区分の1人分（丸めた後の実際の倍率） */
  actualRatio: number;
}

export function clampRatio(r: number): number {
  if (!Number.isFinite(r)) return MIN_RATIO;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, Math.round(r * 10) / 10));
}

export function clampDiscount(d: number): number {
  if (!Number.isFinite(d)) return DEFAULT_DISCOUNT;
  return Math.min(MAX_DISCOUNT, Math.max(MIN_DISCOUNT, Math.round(d * 10) / 10));
}

function sanitizeCounts(counts: number[]): number[] {
  return TIERS.map((_, i) => {
    const c = Math.floor(Number(counts[i] ?? 0));
    return Number.isFinite(c) && c > 0 ? Math.min(c, 99) : 0;
  });
}

/** 飲まない人の人数を、0〜その区分の人数に直す */
export function sanitizeAbstainers(abstainers: number[] | undefined, counts: number[]): number[] {
  const cs = sanitizeCounts(counts);
  return TIERS.map((_, i) => {
    const a = Math.floor(Number(abstainers?.[i] ?? 0));
    return Number.isFinite(a) && a > 0 ? Math.min(a, cs[i]) : 0;
  });
}

/** 人のいる区分の、上からの並びに対する重み（いちばん下が 1、いちばん上が ratio） */
export function weightsFor(activeCount: number, ratio: number): number[] {
  const r = clampRatio(ratio);
  if (activeCount <= 0) return [];
  if (activeCount === 1) return [1];
  return Array.from({ length: activeCount }, (_, p) => 1 + ((r - 1) * (activeCount - 1 - p)) / (activeCount - 1));
}

export function computeSplit(input: SplitInput): SplitResult {
  const total = Math.max(0, Math.floor(Number.isFinite(input.total) ? input.total : 0));
  const counts = sanitizeCounts(input.counts);
  const abst = sanitizeAbstainers(input.abstainers, counts);
  const discount = clampDiscount(input.discount ?? DEFAULT_DISCOUNT);
  const unit = UNITS.includes(input.unit) ? input.unit : 100;
  const names = sanitizeNames(input.names);
  const active = names.map((tier, index) => ({ tier, index, count: counts[index], abstainers: abst[index] })).filter(
    (t) => t.count > 0,
  );
  const weights = weightsFor(active.length, input.ratio);
  const people = active.reduce((s, t) => s + t.count, 0);
  // 飲む人の重み＝区分の重み、飲まない人の重み＝区分の重み×(1−割引率)
  const weightSum = active.reduce(
    (s, t, i) => s + (t.count - t.abstainers) * weights[i] + t.abstainers * weights[i] * (1 - discount),
    0,
  );

  if (people === 0 || total === 0) {
    const shares = active.map((t, i) => ({
      ...t,
      weight: weights[i],
      each: 0,
      subtotal: 0,
      eachAbstain: 0,
      subtotalAbstain: 0,
    }));
    return { shares, people, collected: 0, diff: -total, actualRatio: 1 };
  }

  const raw = active.map((_, i) => (total * weights[i]) / weightSum);
  const rawAbstain = raw.map((v) => v * (1 - discount));
  let eaches: number[];
  let eachesAbstain: number[];
  if (input.rounding === "top") {
    eaches = raw.map((v) => Math.floor(v / unit) * unit);
    eachesAbstain = rawAbstain.map((v) => Math.floor(v / unit) * unit);
    // 足りない分を、いちばん上の区分の飲む人（いなければ飲まない人）が持つ（1円単位で切り上げ）
    const paid = active.reduce(
      (s, t, i) => s + (t.count - t.abstainers) * eaches[i] + t.abstainers * eachesAbstain[i],
      0,
    );
    const short = total - paid;
    if (short > 0) {
      const topDrinkers = active[0].count - active[0].abstainers;
      if (topDrinkers > 0) eaches[0] += Math.ceil(short / topDrinkers);
      else eachesAbstain[0] += Math.ceil(short / active[0].abstainers);
    }
  } else {
    eaches = raw.map((v) => Math.ceil(v / unit) * unit);
    eachesAbstain = rawAbstain.map((v) => Math.ceil(v / unit) * unit);
  }

  const shares = active.map((t, i) => {
    // 飲まない人がいない区分は、eachAbstain を each と同じにする
    const eachAbstain = t.abstainers > 0 ? eachesAbstain[i] : eaches[i];
    return {
      ...t,
      weight: weights[i],
      each: eaches[i],
      eachAbstain,
      subtotalAbstain: eachAbstain * t.abstainers,
      subtotal: eaches[i] * (t.count - t.abstainers) + eachAbstain * t.abstainers,
    };
  });
  const collected = shares.reduce((s, t) => s + t.subtotal, 0);
  const last = eaches[eaches.length - 1];
  const actualRatio = last > 0 ? Math.round((eaches[0] / last) * 100) / 100 : 1;
  return { shares, people, collected, diff: collected - total, actualRatio };
}

export function yen(n: number): string {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

/** 入力欄の文字（「48,600」「４８６００円」など）を金額にする */
export function parseYen(text: string): number {
  const half = text.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
  const digits = half.replace(/[^0-9]/g, "");
  if (digits === "") return 0;
  return Math.min(Number(digits.slice(0, 8)), 9_999_999);
}

export interface Preset {
  name: string;
  ratio: number;
  note: string;
}

export const PRESETS: readonly Preset[] = [
  { name: "平等", ratio: 1.0, note: "同期だけの会・二次会" },
  { name: "ゆるめ", ratio: 1.3, note: "年の近い先輩がいる会" },
  { name: "ふつう", ratio: 1.6, note: "部署の忘年会・新歓" },
  { name: "きつめ", ratio: 2.0, note: "上司が来る会" },
  { name: "上司もち", ratio: 2.8, note: "上司が「多めに出すよ」と言った会" },
];

export interface LineTextInput extends SplitInput {
  title: string;
  organizer: string;
  /** 内訳ページの URL（無ければ書かない） */
  url?: string;
}

export function roundingNote(result: SplitResult, unit: Unit, rounding: Rounding): string {
  const u = `${unit.toLocaleString("ja-JP")}円単位`;
  if (rounding === "top") {
    return result.shares.length > 1 ? `${u}。端数は${result.shares[0].tier}が持ちます。` : `${u}。`;
  }
  if (result.diff > 0) return `${u}で切り上げ。余り${yen(result.diff)}は二次会に回します。`;
  return `${u}で切り上げ。`;
}

/** 端数の欄の見出し：余り・足りない・持つ人を1行で（「余り400円は二次会へ」） */
export function roundingHead(result: SplitResult, rounding: Rounding): string {
  if (result.people === 0 || result.collected === 0) return "金額を入れると、端数が出ます";
  if (result.diff < 0) return `${yen(-result.diff)}足りません`;
  if (rounding === "top" && result.shares.length > 1) return `端数は${result.shares[0].tier}が持つ`;
  if (result.diff > 0) return `余り${yen(result.diff)}は二次会へ`;
  return "ぴったり集まります";
}

/** LINE のトークにそのまま貼る文面 */
export function buildLineText(input: LineTextInput): string {
  const result = computeSplit(input);
  const title = input.title.trim() || "飲み会";
  const lines: string[] = [];
  lines.push(`【${title}】お会計のお知らせ`);
  lines.push(`合計 ${yen(input.total)}／${result.people}人`);
  lines.push("");
  for (const s of result.shares) {
    const allAbstain = s.abstainers === s.count;
    const note =
      s.abstainers === 0
        ? ""
        : allAbstain
          ? `（${s.count > 1 ? "全員" : ""}飲まない）`
          : `（うち飲まない${s.abstainers}人 ${yen(s.eachAbstain)}）`;
    lines.push(`${s.tier}　${yen(allAbstain ? s.eachAbstain : s.each)}${s.count > 1 ? ` ×${s.count}人` : ""}${note}`);
  }
  lines.push("");
  lines.push(roundingNote(result, input.unit, input.rounding));
  const organizer = input.organizer.trim();
  lines.push(organizer ? `幹事の${organizer}まで、お願いします。` : "幹事まで、お願いします。");
  if (input.url) {
    lines.push("");
    lines.push(`内訳：${input.url}`);
  }
  return lines.join("\n");
}

export interface SavedState extends SplitInput {
  title: string;
  organizer: string;
  names: string[];
}

export const DEFAULT_STATE: SavedState = {
  title: "部署の忘年会",
  organizer: "佐藤",
  total: 48600,
  counts: [1, 3, 2, 3, 1],
  ratio: 1.6,
  unit: 100,
  rounding: "up",
  abstainers: [0, 0, 0, 0, 0],
  discount: DEFAULT_DISCOUNT,
  names: [...TIERS],
};

/** 内訳ページの URL の query にする */
export function encodeState(s: SavedState): string {
  const p = new URLSearchParams();
  p.set("t", String(Math.floor(s.total)));
  p.set("c", sanitizeCounts(s.counts).join("-"));
  p.set("r", clampRatio(s.ratio).toFixed(1));
  p.set("u", String(s.unit));
  p.set("m", s.rounding);
  const abst = sanitizeAbstainers(s.abstainers, s.counts);
  if (abst.some((a) => a > 0)) {
    p.set("a", abst.join("-"));
    p.set("d", String(Math.round(clampDiscount(s.discount) * 100)));
  }
  const names = sanitizeNames(s.names);
  if (!isDefaultNames(names)) p.set("g", names.join("\n"));
  if (s.title.trim()) p.set("n", s.title.trim().slice(0, 30));
  if (s.organizer.trim()) p.set("k", s.organizer.trim().slice(0, 20));
  return p.toString();
}

type Params = Record<string, string | string[] | undefined>;

function one(p: Params, key: string): string | undefined {
  const v = p[key];
  return Array.isArray(v) ? v[0] : v;
}

/** URLSearchParams を decodeState が受け取る形に直す（同じ名前が複数あれば配列） */
export function paramsToRecord(sp: { forEach: (cb: (value: string, key: string) => void) => void }): Params {
  const out: Params = {};
  sp.forEach((value, key) => {
    const prev = out[key];
    if (prev === undefined) out[key] = value;
    else out[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
  });
  return out;
}

/** 内訳ページの query から読む。読めない所は既定の値 */
export function decodeState(p: Params): SavedState {
  const total = parseYen(one(p, "t") ?? "");
  const countsText = one(p, "c");
  const counts = countsText ? sanitizeCounts(countsText.split("-").map(Number)) : DEFAULT_STATE.counts;
  const r = Number(one(p, "r"));
  const u = Number(one(p, "u")) as Unit;
  const m = one(p, "m");
  const abstainers = sanitizeAbstainers((one(p, "a") ?? "").split("-").map(Number), counts);
  const dText = one(p, "d");
  const d = dText === undefined || dText === "" ? NaN : Number(dText) / 100;
  const gText = one(p, "g");
  return {
    names: sanitizeNames(gText === undefined ? undefined : gText.split("\n")),
    abstainers,
    discount: Number.isFinite(d) ? clampDiscount(d) : DEFAULT_DISCOUNT,
    total: one(p, "t") === undefined ? DEFAULT_STATE.total : total,
    counts,
    ratio: Number.isFinite(r) && r > 0 ? clampRatio(r) : DEFAULT_STATE.ratio,
    unit: UNITS.includes(u) ? u : 100,
    rounding: m === "top" ? "top" : "up",
    title: (one(p, "n") ?? (one(p, "t") === undefined ? DEFAULT_STATE.title : "")).slice(0, 30),
    organizer: (one(p, "k") ?? (one(p, "t") === undefined ? DEFAULT_STATE.organizer : "")).slice(0, 20),
  };
}
