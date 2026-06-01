"use server";

import { headers } from "next/headers";
import { logAdminAction } from "@/lib/audit/log-admin-action";

export type AdPlacementAuditAction =
  | "ad_placement.create"
  | "ad_placement.update"
  | "ad_placement.enable"
  | "ad_placement.disable"
  | "ad_placement.test_mode"
  | "ad_placement.live_mode"
  | "ad_placement.archive"
  | "ad_placement.duplicate"
  | "ad_placement.adsense_update";

export async function logAdPlacementAudit(input: {
  actorId: string;
  action: AdPlacementAuditAction;
  placementId: string;
  placementKey?: string;
  metadata?: Record<string, unknown>;
}) {
  const hdrs = await headers();
  await logAdminAction({
    actorId: input.actorId,
    action: input.action,
    targetType: "ad_placement",
    targetId: input.placementId,
    metadata: {
      placement_key: input.placementKey,
      ...input.metadata
    },
    ipAddress: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: hdrs.get("user-agent")
  });
}
