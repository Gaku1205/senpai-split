import { TIER_FILL } from "./tierColors";

/** senpai-split のしるし：左から右へ下がる3段の柱（席順の坂） */
export function Mark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="2" y="4" width="8" height="24" rx="2" fill={TIER_FILL[0]} />
      <rect x="12" y="11" width="8" height="17" rx="2" fill={TIER_FILL[2]} />
      <rect x="22" y="18" width="8" height="10" rx="2" fill={TIER_FILL[4]} />
      <rect x="0" y="28" width="32" height="3" rx="1.5" fill="#1b1d1f" />
    </svg>
  );
}
