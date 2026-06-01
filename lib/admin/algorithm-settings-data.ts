"use server";

import { loadAlgorithmControlCenterData } from "@/lib/algorithm/settings";
import { getCurrentAuthContext } from "@/lib/auth/permissions";

export async function loadAlgorithmSettingsPageData() {
  const context = await getCurrentAuthContext();
  const canUpdate = Boolean(
    context?.permissions.includes("admin.settings.update") ||
      context?.permissions.includes("finance.settings.update")
  );

  return loadAlgorithmControlCenterData({ canUpdate });
}
