"use server";

import { createClient } from "@/lib/data/server";
import { getProfilePrivacySettings } from "@/lib/profile/get-profile-privacy";
import { getMessageRestrictionMessage } from "@/lib/messages/get-message-restriction-message";
import { getMessageBlockState } from "@/lib/messages/check-message-block";
import { ensureMessagePrivacySettings } from "@/lib/messages/get-privacy-settings";
import type { CanMessageResult } from "@/types/messages";

const CLOSED_MESSAGE = "Người dùng này chưa mở nhận tin nhắn.";
const BLOCKED_BY_OTHER_MESSAGE = "Không thể gửi tin nhắn.";
const BLOCKED_BY_ME_MESSAGE = "Bạn đã chặn người dùng này.";

async function follows(followerId: string, followingId: string): Promise<boolean> {
  const db = await createClient();
  const { data } = await db
    .from("user_follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  return Boolean(data);
}

async function hasActiveConversation(
  userA: string,
  userB: string
): Promise<string | null> {
  const db = await createClient();

  const { data: myConvs } = await db
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userA);

  const convIds = (myConvs ?? []).map((row) => row.conversation_id as string);
  if (!convIds.length) {
    return null;
  }

  const { data: shared } = await db
    .from("conversation_participants")
    .select("conversation_id, conversations!inner(status)")
    .eq("user_id", userB)
    .in("conversation_id", convIds)
    .eq("conversations.status", "active")
    .limit(1);

  return (shared?.[0]?.conversation_id as string) ?? null;
}

async function hasPendingRequest(
  requesterId: string,
  recipientId: string
): Promise<boolean> {
  const db = await createClient();
  const { data } = await db
    .from("message_requests")
    .select("id")
    .eq("requester_id", requesterId)
    .eq("recipient_id", recipientId)
    .eq("status", "pending")
    .limit(1);

  return (data ?? []).length > 0;
}

export async function canUserMessage(
  senderId: string,
  recipientId: string
): Promise<CanMessageResult> {
  if (senderId === recipientId) {
    return { allowed: false, reason: "Không thể nhắn tin cho chính mình." };
  }

  const restrictionMessage = await getMessageRestrictionMessage(senderId);
  if (restrictionMessage) {
    return { allowed: false, reason: restrictionMessage };
  }

  const blockState = await getMessageBlockState(senderId, recipientId);
  if (blockState === "blocked_by_me") {
    return { allowed: false, reason: BLOCKED_BY_ME_MESSAGE };
  }
  if (blockState === "blocked_by_other") {
    return { allowed: false, reason: BLOCKED_BY_OTHER_MESSAGE };
  }

  const activeConversationId = await hasActiveConversation(senderId, recipientId);
  if (activeConversationId) {
    return { allowed: true, mode: "direct" };
  }

  const [privacy, profilePrivacy] = await Promise.all([
    ensureMessagePrivacySettings(recipientId),
    getProfilePrivacySettings(recipientId)
  ]);

  if (!profilePrivacy.allowDm) {
    return { allowed: false, reason: CLOSED_MESSAGE };
  }

  if (privacy.whoCanMessage === "no_one") {
    return { allowed: false, reason: CLOSED_MESSAGE };
  }

  const senderFollowsRecipient = await follows(senderId, recipientId);
  const recipientFollowsSender = await follows(recipientId, senderId);

  if (privacy.whoCanMessage === "mutual_follow_only") {
    if (senderFollowsRecipient && recipientFollowsSender) {
      return { allowed: true, mode: "direct" };
    }
    if (!privacy.allowMessageRequests) {
      return { allowed: false, reason: CLOSED_MESSAGE };
    }
    return { allowed: true, mode: "request" };
  }

  if (privacy.whoCanMessage === "followers_only") {
    if (recipientFollowsSender) {
      return { allowed: true, mode: "direct" };
    }
    if (!privacy.allowMessageRequests) {
      return { allowed: false, reason: CLOSED_MESSAGE };
    }
    return { allowed: true, mode: "request" };
  }

  if (privacy.whoCanMessage === "everyone") {
    if (senderFollowsRecipient && recipientFollowsSender) {
      return { allowed: true, mode: "direct" };
    }
    if (!privacy.allowMessageRequests) {
      return { allowed: false, reason: CLOSED_MESSAGE };
    }
    return { allowed: true, mode: "request" };
  }

  return { allowed: false, reason: CLOSED_MESSAGE };
}

export async function getMessagingCapability(
  viewerId: string | null,
  recipientId: string
): Promise<{
  canShowButton: boolean;
  canMessage: boolean;
  mode: "direct" | "request" | null;
  reason: string | null;
  loginRequired: boolean;
}> {
  if (!viewerId) {
    return {
      canShowButton: true,
      canMessage: false,
      mode: null,
      reason: null,
      loginRequired: true
    };
  }

  if (viewerId === recipientId) {
    return {
      canShowButton: false,
      canMessage: false,
      mode: null,
      reason: null,
      loginRequired: false
    };
  }

  const result = await canUserMessage(viewerId, recipientId);
  if (!result.allowed) {
    return {
      canShowButton: false,
      canMessage: false,
      mode: null,
      reason: result.reason,
      loginRequired: false
    };
  }

  if (await hasPendingRequest(viewerId, recipientId)) {
    return {
      canShowButton: true,
      canMessage: false,
      mode: "request",
      reason: "Bạn đã gửi yêu cầu tin nhắn.",
      loginRequired: false
    };
  }

  return {
    canShowButton: true,
    canMessage: true,
    mode: result.mode,
    reason: null,
    loginRequired: false
  };
}
