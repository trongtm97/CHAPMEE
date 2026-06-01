import type { RoleCode } from "@/types/permissions";
import type { ProfileRole } from "@/lib/auth/getCurrentProfile";
import type { AdminUserRoleRow } from "@/lib/admin/get-users";
import type { UserCoinBalanceSummary } from "@/types/coins";

export type UserListRoleFilter =
  | "all"
  | "reader"
  | "creator"
  | "verified_creator"
  | "moderator"
  | "admin"
  | "finance_admin"
  | "owner"
  | "support_admin";

export type UserListStatusFilter =
  | "all"
  | "active"
  | "restricted"
  | "banned"
  | "suspended"
  | "pending_verification"
  | "verified"
  | "has_strike"
  | "messaging_restricted"
  | "community_restricted";

export type UserListAccountFilter =
  | "all"
  | "new_account"
  | "has_wallet"
  | "has_topup"
  | "has_payout"
  | "has_studio"
  | "has_reports";

export type UserListTimeFilter = "all" | "today" | "7d" | "30d";

export type UserListSort =
  | "newest"
  | "recent_activity"
  | "most_coins"
  | "most_reports"
  | "most_strikes";

export type UserDashboardFilters = {
  query: string;
  role: UserListRoleFilter;
  status: UserListStatusFilter;
  accountType: UserListAccountFilter;
  timeRange: UserListTimeFilter;
  sort: UserListSort;
  page: number;
  pageSize: number;
  selectedUserId?: string;
};

export type UserOperationsSummary = {
  totalUsers: number;
  newUsers24h: number;
  active7d: number;
  creators: number;
  restrictedUsers: number;
  bannedUsers: number;
  pendingVerification: number;
  usersWithStrikes: number;
};

export type AdminUserListRow = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  profileRole: ProfileRole;
  status: string;
  isVerified: boolean;
  createdAt: string;
  roles: AdminUserRoleRow[];
  coinTotal: number;
  paidCoin: number;
  bonusCoin: number;
  reportCount: number;
  strikeCount: number;
  activeRestrictionLabels: string[];
  lastActivityAt: string | null;
};

export type AdminUserDetailTab =
  | "overview"
  | "roles"
  | "wallet"
  | "activity"
  | "content"
  | "community"
  | "messaging"
  | "violations"
  | "studio"
  | "verification"
  | "audit";

export type AdminUserDetailFull = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  profileRole: ProfileRole;
  status: string;
  isVerified: boolean;
  verificationType: string | null;
  verificationLabel: string | null;
  createdAt: string;
  updatedAt: string | null;
  roles: AdminUserRoleRow[];
  activeBan: {
    id: string;
    reason: string;
    endsAt: string | null;
    createdAt: string;
  } | null;
  coinBalance: UserCoinBalanceSummary | null;
  stats: {
    storiesReading: number;
    saves: number;
    following: number;
    communityPosts: number;
    comments: number;
    reportsSent: number;
    reportsReceived: number;
    safetyBlocked24h: number;
  };
  restrictions: {
    id: string;
    type: string;
    reason: string | null;
    endsAt: string | null;
    source: "account" | "messaging";
  }[];
  strikes: {
    id: string;
    policyArea: string;
    severity: string;
    actionTaken: string;
    note: string | null;
    createdAt: string;
  }[];
  creatorStudio: {
    displayName: string;
    status: string;
    storyCount: number;
  } | null;
  verifications: {
    id: string;
    type: string;
    status: string;
    submittedAt: string | null;
  }[];
  recentAuditLogs: {
    id: string;
    action: string;
    actorName: string;
    createdAt: string;
    metadata: Record<string, unknown>;
  }[];
};

export type UserAdminCapabilities = {
  canViewWallet: boolean;
  canAdjustCoin: boolean;
  canAssignRoles: boolean;
  canBanUsers: boolean;
  canCreateUsers: boolean;
  canRestrictMessaging: boolean;
  canRestrictCommunity: boolean;
  canManageVerification: boolean;
  canViewSensitiveContent: boolean;
  actorRoles: RoleCode[];
};
