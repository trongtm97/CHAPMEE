import { requireAnyPermission } from "@/lib/auth/require-permission";

export async function requireModerationAccess(returnTo = "/admin/content-quality") {
  return requireAnyPermission(
    ["moderation.action.create", "report.review", "admin.dashboard.view"],
    { returnTo }
  );
}
