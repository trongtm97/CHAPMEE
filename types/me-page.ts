import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { CreatorDashboardStats } from "@/lib/creator/getCreatorDashboard";
import type { ContinueReadingItem } from "@/lib/reading/getContinueReading";
import type { ReaderProfileData } from "@/lib/profile/getReaderProfile";
import type { CollectionSummary } from "@/types/collection";
import type { ProfileBadge, ProfileStat } from "@/types/profile";
import type { LifecycleNudgeConfig } from "@/types/lifecycle";
import type { AuthorThankYouView } from "@/types/thank-you";
import type { RewardedAdsAvailability } from "@/types/rewarded-ad";
import type { UserWallet } from "@/types/wallet";
import type { TransactionRow } from "@/types/transaction";
import type { ChapterUnlock } from "@/types/paid-chapter";
import type { VipPlan } from "@/types/vip";
import type { ContactSettings } from "@/types/contact-settings";

export type MePageTab = "overview" | "reading" | "writing" | "activity" | "achievements";

export type PersonalActivityItem = {
  id: string;
  type:
    | "comment"
    | "save"
    | "follow"
    | "badge"
    | "milestone"
    | "top_fan"
    | "thank_you";
  message: string;
  href?: string;
  createdAt: string;
};

export type AchievementPreviewItem = {
  id: string;
  title: string;
  description: string;
  status: "unlocked" | "locked" | "near";
  progress?: { current: number; target: number };
  value?: string;
};

export type CreatorStudioStats = {
  stories: number;
  reads: number;
  comments: number;
  revenue?: number | null;
};

export type MePageUser = {
  id: string;
  email: string | null;
  displayName: string;
  handle: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
};

export type MePageData = {
  user: MePageUser;
  stats: ProfileStat[];
  profileBadges: ProfileBadge[];
  currentlyReading: ContinueReadingItem[];
  readerProfile: ReaderProfileData;
  creatorProfile: CreatorProfile | null;
  creatorStats: CreatorStudioStats | null;
  collections: CollectionSummary[];
  thankYous: AuthorThankYouView[];
  communityGroupsCount: number;
  activities: PersonalActivityItem[];
  achievementPreview: AchievementPreviewItem[];
  unreadNotificationCount: number;
  lifecycleNudge: LifecycleNudgeConfig | null;
  accountNotice: string | null;
  permissionFlags: {
    canCreateStory: boolean;
    canOpenStudio: boolean;
    canViewAdmin: boolean;
    canManageFinance: boolean;
  };
  refreshError: string | null;
  shareUrl: string;
  contactSettings: ContactSettings;
  monetization: {
    showCoinWallet: boolean;
    coinDisplayName: string;
    coinPurchaseEnabled: boolean;
    wallet: UserWallet | null;
    transactions: TransactionRow[];
    chapterUnlocks: ChapterUnlock[];
    rewardedAdsAvailability: RewardedAdsAvailability;
    vipEnabled: boolean;
    vipActive: boolean;
    vipPlan: VipPlan | null;
    vipExpiresAt: string | null;
  };
};
