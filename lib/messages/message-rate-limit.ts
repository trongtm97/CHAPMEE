import { createClient } from "@/lib/supabase/server";
import { normalizeMessageText } from "@/lib/moderation/normalize-message-text";
import { enforceRateLimit } from "@/lib/rate-limit";

export const RATE_LIMIT_MESSAGE =
  "Bạn đang gửi tin quá nhanh. Hãy thử lại sau ít phút.";

export const DUPLICATE_MESSAGE_ERROR =
  "Bạn đã gửi nội dung này nhiều lần. Vui lòng thay đổi tin nhắn.";

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const DUPLICATE_MAX = 3;

export async function checkMessageRequestRateLimit(
  userId: string,
  accountAgeHours: number,
  isCreatorOrStaff: boolean,
  hasTrustedActivity: boolean
): Promise<{ allowed: boolean; error?: string }> {
  let dailyLimit = isCreatorOrStaff ? 15 : 5;
  if (accountAgeHours < 24) {
    dailyLimit = 2;
  } else if (!hasTrustedActivity) {
    dailyLimit = Math.min(dailyLimit, 3);
  }

  const result = await enforceRateLimit("message_request", userId, {
    count: dailyLimit,
    windowMs: 24 * 60 * 60 * 1000
  });

  if (!result.allowed) {
    return { allowed: false, error: RATE_LIMIT_MESSAGE };
  }
  return { allowed: true };
}

export async function checkConversationMessageRateLimit(
  userId: string,
  conversationId: string
): Promise<{ allowed: boolean; error?: string }> {
  const supabase = await createClient();
  const windowStart = new Date(Date.now() - 60_000).toISOString();

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", userId)
    .eq("conversation_id", conversationId)
    .gte("created_at", windowStart);

  if (error) {
    return { allowed: true };
  }

  if ((count ?? 0) >= 20) {
    return { allowed: false, error: RATE_LIMIT_MESSAGE };
  }

  return { allowed: true };
}

export async function checkGlobalMessageRateLimit(
  userId: string,
  accountAgeHours: number
): Promise<{ allowed: boolean; error?: string }> {
  const supabase = await createClient();
  const isNewAccount = accountAgeHours < 24;
  const windowMs = 10 * 60 * 1000;
  const maxCount = isNewAccount ? 10 : 60;
  const windowStart = new Date(Date.now() - windowMs).toISOString();

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", windowStart);

  if (error) {
    return { allowed: true };
  }

  if ((count ?? 0) >= maxCount) {
    return { allowed: false, error: RATE_LIMIT_MESSAGE };
  }

  return { allowed: true };
}

function countNormalizedDuplicates(bodies: string[], normalized: string): number {
  return bodies.filter((b) => normalizeMessageText(b) === normalized).length;
}

export async function checkDuplicateMessage(
  userId: string,
  conversationId: string,
  body: string
): Promise<{ allowed: boolean; error?: string }> {
  const normalized = normalizeMessageText(body);
  if (!normalized) {
    return { allowed: true };
  }

  const supabase = await createClient();
  const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();

  const { data: inConversation, error: convError } = await supabase
    .from("messages")
    .select("body")
    .eq("sender_id", userId)
    .eq("conversation_id", conversationId)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false })
    .limit(15);

  if (!convError) {
    const convCount = countNormalizedDuplicates(
      (inConversation ?? []).map((r) => r.body as string),
      normalized
    );
    if (convCount >= DUPLICATE_MAX) {
      return { allowed: false, error: DUPLICATE_MESSAGE_ERROR };
    }
  }

  const { data: globalMessages, error: globalError } = await supabase
    .from("messages")
    .select("body")
    .eq("sender_id", userId)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false })
    .limit(30);

  if (!globalError) {
    const globalCount = countNormalizedDuplicates(
      (globalMessages ?? []).map((r) => r.body as string),
      normalized
    );
    if (globalCount >= DUPLICATE_MAX) {
      return { allowed: false, error: DUPLICATE_MESSAGE_ERROR };
    }
  }

  const { data: recentRequests, error: reqError } = await supabase
    .from("message_requests")
    .select("first_message")
    .eq("requester_id", userId)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!reqError) {
    const reqCount = countNormalizedDuplicates(
      (recentRequests ?? []).map((r) => r.first_message as string),
      normalized
    );
    if (reqCount >= DUPLICATE_MAX) {
      return { allowed: false, error: DUPLICATE_MESSAGE_ERROR };
    }
  }

  return { allowed: true };
}

export async function checkDuplicateRequestMessage(
  userId: string,
  body: string
): Promise<{ allowed: boolean; error?: string }> {
  const normalized = normalizeMessageText(body);
  if (!normalized) {
    return { allowed: true };
  }

  const supabase = await createClient();
  const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();

  const [{ data: recentRequests }, { data: globalMessages }] = await Promise.all([
    supabase
      .from("message_requests")
      .select("first_message")
      .eq("requester_id", userId)
      .gte("created_at", windowStart)
      .limit(15),
    supabase
      .from("messages")
      .select("body")
      .eq("sender_id", userId)
      .gte("created_at", windowStart)
      .limit(30)
  ]);

  const requestCount = countNormalizedDuplicates(
    (recentRequests ?? []).map((r) => r.first_message as string),
    normalized
  );
  if (requestCount >= DUPLICATE_MAX) {
    return { allowed: false, error: DUPLICATE_MESSAGE_ERROR };
  }

  const msgCount = countNormalizedDuplicates(
    (globalMessages ?? []).map((r) => r.body as string),
    normalized
  );
  if (msgCount >= DUPLICATE_MAX) {
    return { allowed: false, error: DUPLICATE_MESSAGE_ERROR };
  }

  return { allowed: true };
}

export async function checkRequestCooldown(
  requesterId: string,
  recipientId: string
): Promise<{ allowed: boolean; error?: string }> {
  const supabase = await createClient();
  const cooldownStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("message_requests")
    .select("id, status, created_at")
    .eq("requester_id", requesterId)
    .eq("recipient_id", recipientId)
    .in("status", ["rejected", "blocked"])
    .gte("responded_at", cooldownStart)
    .order("responded_at", { ascending: false })
    .limit(1);

  if ((data ?? []).length > 0) {
    return {
      allowed: false,
      error: "Yêu cầu tin nhắn trước đã bị từ chối. Hãy thử lại sau."
    };
  }

  return { allowed: true };
}
