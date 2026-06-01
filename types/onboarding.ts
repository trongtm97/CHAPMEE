export type OnboardingRolePreference = "reader" | "author" | "both";

export type OnboardingGoal =
  | "discover_short_stories"
  | "reels_like_tiktok"
  | "follow_authors"
  | "comment_vote"
  | "save_for_later"
  | "publish_first_story"
  | "find_readers"
  | "build_fanbase"
  | "get_feedback"
  | "earn_money_later";

export type OnboardingState = {
  completed: boolean;
  completedAt: string | null;
  rolePreference: OnboardingRolePreference | null;
  favoriteGenres: string[];
  goals: OnboardingGoal[];
};

/** Stored in profile.favorite_genres — taxonomy main_genre slugs or legacy names. */
export type OnboardingFavoriteGenre = string;
