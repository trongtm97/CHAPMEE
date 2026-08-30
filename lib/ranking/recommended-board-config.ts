/**
 * Boosted / "Được đề cử" ranking weights (MVP).
 * TODO: Move recommendation ranking weights to admin settings (engagement_settings / boost.*).
 */
export const RECOMMENDED_RANKING_CONFIG = {
  /** Multiplier on summed boost_points in the selected window. */
  boostPointWeight: 1,
  /** Stories published within this many days get a small score bonus when they have real boosts. */
  newStoryBoostDays: 14,
  newStoryScoreBonus: 2,
  /** Max extra points from engagement signals (save / read-through) when metrics exist. */
  interactionBonusCap: 3,
  /** Half-life for decay when using daily stats path (matches boost settings default). */
  defaultDecayHalfLifeDays: 7
} as const;
