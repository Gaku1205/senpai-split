import { DEFAULT_STATE, UNITS, clampDiscount, clampRatio, sanitizeAbstainers, sanitizeNames, type SavedState, type Unit } from "./split";

export const STORAGE_KEY = "senpai-split:last";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 保存された JSON 文字列を SavedState にする。読めなければ null */
export function parseSaved(raw: string | null): SavedState | null {
  if (raw === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;

  const total =
    typeof data.total === "number" && Number.isFinite(data.total)
      ? Math.min(9_999_999, Math.max(0, Math.floor(data.total)))
      : DEFAULT_STATE.total;
  const rawCounts: unknown = data.counts;
  const counts = Array.isArray(rawCounts)
    ? DEFAULT_STATE.counts.map((_, i) => {
        const c: unknown = rawCounts[i];
        return typeof c === "number" && Number.isFinite(c) ? Math.min(99, Math.max(0, Math.floor(c))) : 0;
      })
    : [...DEFAULT_STATE.counts];
  const ratio = typeof data.ratio === "number" && Number.isFinite(data.ratio) ? clampRatio(data.ratio) : DEFAULT_STATE.ratio;
  const unit = UNITS.find((u) => u === data.unit) ?? (100 as Unit);
  const rounding = data.rounding === "top" ? "top" : "up";
  const title = typeof data.title === "string" ? data.title.slice(0, 30) : DEFAULT_STATE.title;
  const organizer = typeof data.organizer === "string" ? data.organizer.slice(0, 20) : DEFAULT_STATE.organizer;
  const rawAbst: unknown = data.abstainers;
  const abstainers = sanitizeAbstainers(
    Array.isArray(rawAbst) ? rawAbst.map((a: unknown) => (typeof a === "number" ? a : 0)) : undefined,
    counts,
  );
  const discount =
    typeof data.discount === "number" && Number.isFinite(data.discount) ? clampDiscount(data.discount) : DEFAULT_STATE.discount;
  const names = sanitizeNames(Array.isArray(data.names) ? (data.names as unknown[]) : undefined);
  return { title, organizer, total, counts, ratio, unit, rounding, abstainers, discount, names };
}

/** 端末に覚えた前回の会計を読む。無い・壊れている・使えないときは null */
export function loadSaved(storage: StorageLike | null = defaultStorage()): SavedState | null {
  if (!storage) return null;
  try {
    return parseSaved(storage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** 前回の会計として覚える。失敗しても何も起こさない */
export function saveState(state: SavedState, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        title: state.title,
        organizer: state.organizer,
        total: state.total,
        counts: state.counts,
        ratio: state.ratio,
        unit: state.unit,
        rounding: state.rounding,
        abstainers: state.abstainers,
        discount: state.discount,
        names: sanitizeNames(state.names),
      }),
    );
  } catch {
    // 容量不足・プライベートモードなど。画面は止めない
  }
}
