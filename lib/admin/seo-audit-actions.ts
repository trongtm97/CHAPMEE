"use server";

import { revalidatePath } from "next/cache";
import { persistSeoAuditFindings, runSeoAuditMvp } from "@/lib/seo/audit";
import {
  runSeoAuditBatch,
  type SeoAuditBatchResult,
  type SeoAuditGroup
} from "@/lib/seo/seo-audit-service";
import { SEO_AUDIT_DEFAULT_PAGE_SIZE } from "@/lib/seo/seo-audit-rules";

const REVALIDATE_PATHS = ["/admin/seo/audit", "/admin/seo", "/admin/seo/control"];

function revalidateAuditPaths() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

async function assertAuditPermission() {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  return checkStaffPermission("seo.audit.view");
}

/** Legacy full audit (seo_rules + content slugs) — kept for control center. */
export async function runSeoAuditAction() {
  const staff = await assertAuditPermission();

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

  revalidateAuditPaths();

  return report;
}

/** Run audit for one group with pagination (MVP batch). */
export async function runSeoAuditGroupAction(
  group: SeoAuditGroup,
  page = 1,
  pageSize = SEO_AUDIT_DEFAULT_PAGE_SIZE
): Promise<SeoAuditBatchResult> {
  const staff = await assertAuditPermission();

  if (!staff.ok) {
    return {
      group,
      page,
      pageSize,
      total: 0,
      totalPages: 1,
      items: [],
      summary: { averageScore: 0, issueCount: 0, criticalCount: 0 },
      error: staff.error
    };
  }

  const result = await runSeoAuditBatch({ group, page, pageSize });
  revalidateAuditPaths();
  return result;
}
