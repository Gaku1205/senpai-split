/** 区分の色：生ビールの金色の5段。上の区分ほど濃い（docs/design.md「色」） */
export const TIER_FILL = ["#b87800", "#d99a0b", "#eebb3a", "#f5d27a", "#f9e4ad"] as const;

export function tierFill(index: number): string {
  return TIER_FILL[Math.min(Math.max(index, 0), TIER_FILL.length - 1)];
}
