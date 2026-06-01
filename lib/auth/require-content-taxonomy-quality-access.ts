import { requireAnyPermission } from "@/lib/auth/require-permission";

export async function requireContentTaxonomyQualityAccess(returnPath: string) {
  return requireAnyPermission(
    [
      "content_taxonomy_quality.view",
      "moderation.action.create",
      "report.review",
      "admin.dashboard.view"
    ],
    { returnTo: returnPath }
  );
}
