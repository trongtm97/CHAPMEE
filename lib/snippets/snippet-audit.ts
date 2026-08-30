import "server-only";

import { db } from "@/lib/db";
import { codeSnippetAuditLogs } from "@/lib/db/schema/code-snippets";
import { logAdminAction } from "@/lib/audit/log-admin-action";

export async function logSnippetAudit(input: {
  snippetId: string | null;
  action: string;
  actorId: string | null;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await db.insert(codeSnippetAuditLogs).values({
    snippetId: input.snippetId,
    action: input.action,
    beforeSnapshot: input.beforeSnapshot ?? null,
    afterSnapshot: input.afterSnapshot ?? null,
    actorId: input.actorId,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null
  });

  if (input.actorId) {
    await logAdminAction({
      actorId: input.actorId,
      action: `snippet.${input.action}`,
      targetType: "code_snippet",
      targetId: input.snippetId,
      metadata: {
        action: input.action,
        before: input.beforeSnapshot ?? null,
        after: input.afterSnapshot ?? null
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
  }
}
