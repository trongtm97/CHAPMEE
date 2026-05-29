export type OnboardingRolePreference = "reader" | "author" | "both";

export type OnboardingGoal =
  | "discover_short_stories"
  | "swipe_like_tiktok"
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

export const ONBOARDING_GENRES = [
  "Ngôn tình",
  "Học đường",
  "Tổng tài",
  "Drama gia đình",
  "Kinh dị",
  "Trinh thám",
  "Xuyên không",
  "Trọng sinh",
  "Tu tiên/fantasy",
  "BL/GL",
  "Chữa lành",
  "Chat story"
] as const;
