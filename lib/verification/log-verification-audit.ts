"use server";

import { createClient } from "@/lib/supabase/server";

export async function logVerificationAudit(input: {
  requestId?: string | null;
  userId?: string | null;
  actorId: string;
  actorRole: "user" | "admin" | "moderator";
  action: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("account_verification_audit_logs").insert({
    action: input.action,
    actor_id: input.actorId,
    actor_role: input.actorRole,
    metadata: input.metadata ?? {},
    request_id: input.requestId ?? null,
    user_id: input.userId ?? null
  });
}
