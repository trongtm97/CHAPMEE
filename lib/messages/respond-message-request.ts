"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/data/server";
import { notifyMessageRequestAccepted } from "@/lib/notifications/create-message-notification";

export type RespondRequestResult = {
  ok: boolean;
  error?: string;
  conversationId?: string;
};

export async function acceptMessageRequest(
  recipientId: string,
  requestId: string
): Promise<RespondRequestResult> {
  const db = await createClient();

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user || user.id !== recipientId) {
    return { ok: false, error: "Yêu cầu không hợp lệ." };
  }

  const { data: conversationId, error } = await db.rpc("accept_message_request", {
    p_request_id: requestId
  });

  if (error || !conversationId) {
    return { ok: false, error: "Không chấp nhận được yêu cầu." };
  }

  const { data: request } = await db
    .from("message_requests")
    .select("requester_id")
    .eq("id", requestId)
    .maybeSingle();

  const { data: recipientProfile } = await db
    .from("profiles")
    .select("display_name, username")
    .eq("id", recipientId)
    .maybeSingle();

  if (request?.requester_id) {
    await notifyMessageRequestAccepted(
      request.requester_id as string,
      recipientId,
      recipientProfile?.display_name ??
        recipientProfile?.username ??
        "Người nhận",
      conversationId as string
    );
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);

  return { ok: true, conversationId: conversationId as string };
}

export async function rejectMessageRequest(
  recipientId: string,
  requestId: string
): Promise<RespondRequestResult> {
  const db = await createClient();

  const { error } = await db
    .from("message_requests")
    .update({
      status: "rejected",
      responded_at: new Date().toISOString()
    })
    .eq("id", requestId)
    .eq("recipient_id", recipientId)
    .eq("status", "pending");

  if (error) {
    return { ok: false, error: "Không từ chối được yêu cầu." };
  }

  revalidatePath("/messages");
  return { ok: true };
}

export async function blockFromMessageRequest(
  recipientId: string,
  requestId: string
): Promise<RespondRequestResult> {
  const db = await createClient();

  const { data: request } = await db
    .from("message_requests")
    .select("requester_id")
    .eq("id", requestId)
    .eq("recipient_id", recipientId)
    .maybeSingle();

  if (!request) {
    return { ok: false, error: "Yêu cầu không hợp lệ." };
  }

  await db.from("message_blocks").upsert(
    {
      blocker_id: recipientId,
      blocked_id: request.requester_id as string,
      reason: "message_request"
    },
    { onConflict: "blocker_id,blocked_id" }
  );

  await db
    .from("message_requests")
    .update({
      status: "blocked",
      responded_at: new Date().toISOString()
    })
    .eq("id", requestId);

  revalidatePath("/messages");
  return { ok: true };
}
