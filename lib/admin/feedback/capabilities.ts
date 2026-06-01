import type { PermissionCode } from "@/types/permissions";
import type { FeedbackAdminCapabilities } from "@/types/admin-feedback";

function has(perms: string[], code: PermissionCode | string) {
  return perms.includes(code);
}

export function buildFeedbackAdminCapabilities(
  permissions: string[]
): FeedbackAdminCapabilities {
  const canView = has(permissions, "feedback.view.all");
  const canUpdateStatus = has(permissions, "feedback.update.status");
  const canAssign =
    has(permissions, "feedback.assign") || canUpdateStatus;
  const canReply =
    has(permissions, "feedback.reply") || canUpdateStatus;
  const canExport = has(permissions, "feedback.export");

  return {
    canView,
    canUpdateStatus,
    canAssign,
    canReply,
    canExport
  };
}
