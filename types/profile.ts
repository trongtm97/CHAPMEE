export type ProfileBadgeTone = "default" | "success" | "warning" | "danger";

export type ProfileBadge = {
  label: string;
  tone?: ProfileBadgeTone;
  description?: string;
};

export type ProfileStat = {
  label: string;
  value: string;
  hint?: string;
};

export type ProfileAchievementStatus = "unlocked" | "locked" | "unavailable";

export type ProfileAchievement = {
  id: string;
  title: string;
  description: string;
  status: ProfileAchievementStatus;
  value?: string;
  tone?: ProfileBadgeTone;
};

export type ProfileStoryItem = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  subtitle: string | null;
  meta: string | null;
  progressPercent?: number | null;
};
