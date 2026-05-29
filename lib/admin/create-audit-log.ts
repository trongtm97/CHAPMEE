"use server";

import { headers } from "next/headers";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { logAdminAction, type AdminAuditAction } from "@/lib/audit/log-admin-action";

export type CreateAdminAuditLogInput = {
  action: AdminAuditAction | string;
  targetType?: string | null;
  targetId?: string | null;
  note?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  actorId?: string;
};

export async function createAdminAuditLog(input: CreateAdminAuditLogInput) {
  const ctx = input.actorId
    ? { userId: input.actorId }
    : await getCurrentAuthContext();

  if (!ctx?.userId) {
    return { ok: false, error: "Không xác định được admin." };
  }

  const headerStore = await headers();

  return logAdminAction({
    actorId: ctx.userId,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerStore.get("user-agent"),
    metadata: {
      ...(input.metadata ?? {}),
      note: input.note ?? null,
      before: input.before ?? null,
      after: input.after ?? null
    }
  });
}
