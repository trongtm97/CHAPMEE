/** Portrait story/chapter cover — 3:4 everywhere in product UI. */
export const CHAPMEE_COVER_ASPECT_CLASS = "aspect-[3/4]" as const;

/** Fixed widths; height follows 3:4 (mobile discover ≈ 88×117px, desktop ≈ 120×160px). */
export const CHAPMEE_COVER_SIZE_CLASS = {
  xs: "w-10",
  sm: "w-24",
  md: "w-[7.5rem]",
  lg: "w-[8.25rem]",
  xl: "w-[9.5rem]",
  /** ~88px wide — discover row card mobile */
  discoverSm: "w-[5.5rem]",
  /** ~120px wide — discover row card desktop */
  discover: "w-[7.5rem]",
  /** ~132px wide — featured discover row */
  discoverLg: "w-[8.25rem]",
  /** ~116px wide — catalog row card mobile */
  catalogRow: "w-[7.25rem]",
  full: "w-full"
} as const;

export type ChapMeeCoverSize = keyof typeof CHAPMEE_COVER_SIZE_CLASS;
