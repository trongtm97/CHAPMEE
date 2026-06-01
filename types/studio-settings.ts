import type { ProfilePrivacySettings } from "@/types/public-profile";
import type { UserVerificationSummary } from "@/types/verification";

export type StudioSettingsFormValues = {
  displayName: string;
  username: string;
  /** true khi tác giả đã có username hoặc đã chỉnh username thủ công */
  usernameManuallyEdited: boolean;
  bio: string;
  avatarUrl: string;
  privacy: Omit<ProfilePrivacySettings, "userId" | "updatedAt">;
};

export type StudioSettingsPageData = {
  creatorId: string;
  userId: string;
  email: string | null;
  accountCreatedAt: string | null;
  /** Route nội bộ ChapMee, ví dụ /me/banhcuonnho */
  profilePath: string;
  publicStoriesCount: number;
  followerCount: number;
  verification: UserVerificationSummary;
  initialValues: StudioSettingsFormValues;
};

export type StudioSettingsSaveResult = {
  error: string | null;
  success: boolean;
  fieldErrors?: Partial<Record<string, string>>;
};

export type UsernameCheckStatus = "idle" | "valid" | "invalid" | "taken" | "checking";
