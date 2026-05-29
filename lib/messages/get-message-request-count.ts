"use server";

import { createClient } from "@/lib/supabase/server";

export async function getPendingMessageRequestCount(
  recipientId: string
): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_pending_message_request_count", {
    p_user_id: recipientId
  });

  if (error) {
    const { count } = await supabase
      .from("message_requests")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", recipientId)
      .eq("status", "pending");

    return count ?? 0;
  }

  const n = typeof data === "number" ? data : Number(data);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
