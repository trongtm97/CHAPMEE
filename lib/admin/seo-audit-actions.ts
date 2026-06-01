"use server";

import { revalidatePath } from "next/cache";
import { persistSeoAuditFindings, runSeoAuditMvp } from "@/lib/seo/audit";

export async function runSeoAuditAction() {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const staff = await checkStaffPermission("seo.audit.view");

  if (!staff.ok) {
    return {
      rules: [],
      findings: [],
      error: staff.error
    };
  }

  const report = await runSeoAuditMvp();

  if (!report.error && report.findings.length > 0) {
    await persistSeoAuditFindings(report.findings);
  }

  revalidatePath("/admin/seo/audit");
  revalidatePath("/admin/seo");
  revalidatePath("/admin/content-hub/platform");

  return report;
}
