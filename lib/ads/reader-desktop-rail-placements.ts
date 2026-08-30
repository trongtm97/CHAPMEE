export const READER_DESKTOP_RAIL_PLACEMENTS = {
  left: "desktop_reader_left_rail",
  right: "desktop_reader_right_rail"
} as const;

export type ReaderDesktopRailSide = keyof typeof READER_DESKTOP_RAIL_PLACEMENTS;
