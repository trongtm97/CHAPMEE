import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import type { ProfileRole } from "@/lib/auth/getCurrentProfile";
import {
  legacyRoleToRbacCodes,
  mergeRoleCodes,
  STAFF_ROLE_CODES
} from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type { AuthPermissionContext } from "@/types/auth";
import type {
  ClientPermissionFlags,
  PermissionCode,
  RoleCode
} from "@/types/permissions";

const LEGACY_ADMIN_PERMISSIONS: PermissionCode[] = [
  "admin.dashboard.view",
  "admin.user.view",
  "admin.user.update",
  "admin.user.ban",
  "admin.settings.view",
  "admin.settings.update",
  "admin.audit.view",
  "report.review",
  "comment.moderate",
  "community.post.moderate",
  "community.group.moderate",
  "moderation.action.create",
  "moderation.ban_user",
  "moderation.unban_user",
  "moderation.appeal.review",
  "moderation.policy.manage",
  "story.approve",
  "story.reject",
  "story.feature",
  "story.moderate",
  "chapter.set_vip",
  "community.group.approve",
  "feedback.view.all",
  "feedback.update.status"
];

const LEGACY_MODERATOR_PERMISSIONS: PermissionCode[] = [
  "report.review",
  "comment.moderate",
  "community.post.moderate",
  "community.group.moderate",
  "moderation.action.create",
  "moderation.ban_user",
  "moderation.appeal.review"
];

const LEGACY_FOUNDER_PERMISSIONS: PermissionCode[] = [
  ...LEGACY_ADMIN_PERMISSIONS,
  "admin.user.role.assign",
  "finance.dashboard.view",
  "finance.payout.view",
  "finance.payout.approve",
  "finance.payout.reject",
  "finance.wallet.adjust",
  "finance.wallet.view",
  "finance.wallet.bulk_adjust",
  "finance.wallet.audit",
  "finance.wallet.export",
  "finance.refund.create",
  "finance.refund.view",
  "finance.refund.approve",
  "finance.refund.reject",
  "finance.refund.complete",
  "finance.refund.override",
  "finance.refund.export",
  "finance.refund.audit.view",
  "finance.report.export",
  "finance.risk.view",
  "finance.settings.view",
  "finance.settings.update",
  "finance.revenue_share.update",
  "finance.withdrawal_settings.update",
  "finance.risk_settings.update",
  "finance.audit.view",
  "wallet.transaction.view.all"
];

const LEGACY_CREATOR_PERMISSIONS: PermissionCode[] = [
  "story.create",
  "story.update.own",
  "story.delete.own",
  "story.publish.own",
  "chapter.create",
  "chapter.update.own",
  "chapter.delete.own",
  "chapter.publish.own",
  "creator.dashboard.view.own",
  "creator.revenue.view.own",
  "creator.payout.request"
];

const READER_PERMISSIONS: PermissionCode[] = [
  "comment.create",
  "reaction.create",
  "reaction.delete.own",
  "follow.create",
  "follow.delete.own",
  "save.create",
  "save.delete.own",
  "wallet.view.own",
  "wallet.topup",
  "wallet.purchase",
  "wallet.tip",
  "wallet.transaction.view.own",
  "report.create",
  "community.group.create",
  "notification.view.own",
  "notification.settings.update.own",
  "feedback.create",
  "chapter.purchase"
];

function legacyPermissionsForRole(role: ProfileRole | null): PermissionCode[] {
  switch (role) {
    case "founder":
      return LEGACY_FOUNDER_PERMISSIONS;
    case "admin":
      return LEGACY_ADMIN_PERMISSIONS;
    case "moderator":
      return LEGACY_MODERATOR_PERMISSIONS;
    default:
      return [];
  }
}

function buildClientFlags(input: {
  permissions: Set<PermissionCode>;
  roles: Set<RoleCode>;
  isBanned: boolean;
}): ClientPermissionFlags {
  const { permissions, roles, isBanned } = input;
  return {
    canCreateStory:
      !isBanned &&
      (permissions.has("story.create") || roles.has("creator")),
    canOpenStudio:
      !isBanned &&
      (permissions.has("creator.dashboard.view.own") || roles.has("creator")),
    canModerateComments:
      permissions.has("comment.moderate") || roles.has("moderator"),
    canViewAdmin: permissions.has("admin.dashboard.view"),
    canManageFinance: permissions.has("finance.dashboard.view"),
    isBanned
  };
}

type UserRoleRow = {
  roles: { code: RoleCode } | { code: RoleCode }[] | null;
  expires_at: string | null;
};

type RolePermissionRow = {
  permissions: { code: PermissionCode } | { code: PermissionCode }[] | null;
};

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export const getAuthContextForUser = cache(async function getAuthContextForUser(
  userId: string,
  profileRole: ProfileRole | null = null,
  profileStatus: string | null = "active"
): Promise<AuthPermissionContext> {
  const supabase = await createClient();
  let rbacRoles: RoleCode[] = [];
  let rbacPermissions: PermissionCode[] = [];

  const rolesResult = await supabase
    .from("user_roles")
    .select("expires_at, roles(code)")
    .eq("user_id", userId);

  if (!rolesResult.error) {
    const rows = (rolesResult.data ?? []) as UserRoleRow[];
    const now = Date.now();
    rbacRoles = rows
      .filter((row) => {
        if (!row.expires_at) return true;
        return new Date(row.expires_at).getTime() > now;
      })
      .map((row) => unwrapRelation(row.roles)?.code)
      .filter((code): code is RoleCode => Boolean(code));
  } else if (!isMissingSchemaError(rolesResult.error)) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[rbac] user_roles:", rolesResult.error.message);
    }
  }

  const mergedRoles = mergeRoleCodes(rbacRoles, profileRole);
  const roleSet = new Set<RoleCode>(mergedRoles);

  if (roleSet.size > 0) {
    const { data: roleRows } = await supabase
      .from("roles")
      .select("id, code")
      .in("code", [...roleSet]);

    const roleIds = (roleRows ?? []).map((row) => row.id as string);
    if (roleIds.length > 0) {
      const permResult = await supabase
        .from("role_permissions")
        .select("permissions(code)")
        .in("role_id", roleIds);

      if (!permResult.error) {
        const permRows = (permResult.data ?? []) as RolePermissionRow[];
        rbacPermissions = permRows
          .map((row) => unwrapRelation(row.permissions)?.code)
          .filter((code): code is PermissionCode => Boolean(code));
      }
    }
  }

  const permissionSet = new Set<PermissionCode>([
    ...READER_PERMISSIONS,
    ...rbacPermissions,
    ...legacyPermissionsForRole(profileRole)
  ]);

  if (roleSet.has("creator") || roleSet.has("verified_creator")) {
    for (const perm of LEGACY_CREATOR_PERMISSIONS) {
      permissionSet.add(perm);
    }
  }

  if (roleSet.has("owner")) {
    const { data: allPerms } = await supabase.from("permissions").select("code");
    for (const row of allPerms ?? []) {
      if (row.code) {
        permissionSet.add(row.code as PermissionCode);
      }
    }
  }

  const isBanned =
    profileStatus === "banned" ||
    roleSet.has("banned_user") ||
    (await isUserBanned(userId));

  if (isBanned) {
    const blocked: PermissionCode[] = [
      "comment.create",
      "story.create",
      "chapter.create",
      "community.post.create",
      "wallet.topup",
      "creator.payout.request"
    ];
    for (const code of blocked) {
      permissionSet.delete(code);
    }
  }

  return {
    userId,
    roles: [...roleSet],
    permissions: [...permissionSet],
    profileRole,
    profileStatus,
    flags: buildClientFlags({
      permissions: permissionSet,
      roles: roleSet,
      isBanned
    })
  };
});

async function isUserBanned(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_bans")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1);

  if (error && isMissingSchemaError(error)) {
    return false;
  }

  return (data ?? []).length > 0;
}

async function loadProfileAuthHints(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return { profileRole: null as ProfileRole | null, profileStatus: "active" };
  }

  return {
    profileRole: (data.role as ProfileRole | null) ?? null,
    profileStatus: String(data.status ?? "active")
  };
}

export async function getUserRoles(userId: string) {
  const hints = await loadProfileAuthHints(userId);
  const ctx = await getAuthContextForUser(
    userId,
    hints.profileRole,
    hints.profileStatus
  );
  return ctx.roles;
}

export async function getUserPermissions(userId: string) {
  const hints = await loadProfileAuthHints(userId);
  const ctx = await getAuthContextForUser(
    userId,
    hints.profileRole,
    hints.profileStatus
  );
  return ctx.permissions;
}

export async function hasRole(userId: string, roleCode: RoleCode) {
  const roles = await getUserRoles(userId);
  return roles.includes(roleCode);
}

export async function hasPermission(
  userId: string,
  permissionCode: PermissionCode
) {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permissionCode);
}

export async function hasAnyPermission(
  userId: string,
  permissionCodes: PermissionCode[]
) {
  const permissions = new Set(await getUserPermissions(userId));
  return permissionCodes.some((code) => permissions.has(code));
}

export async function isOwner(userId: string) {
  return hasRole(userId, "owner");
}

export async function getCurrentAuthContext(): Promise<AuthPermissionContext | null> {
  const { user, profile } = await getCurrentUser();
  if (!user) return null;

  const status =
    profile && "status" in profile
      ? String((profile as { status?: string }).status ?? "active")
      : "active";

  return getAuthContextForUser(
    user.id,
    profile?.role ?? null,
    status
  );
}

export function isStaffFromContext(ctx: AuthPermissionContext | null) {
  if (!ctx) return false;
  return (
    ctx.roles.some((role) => STAFF_ROLE_CODES.includes(role)) ||
    ctx.profileRole === "admin" ||
    ctx.profileRole === "moderator" ||
    ctx.profileRole === "founder"
  );
}

export { legacyRoleToRbacCodes };
