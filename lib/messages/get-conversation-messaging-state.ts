"use server";

import { getMessageBlockState } from "@/lib/messages/check-message-block";
import { getMessageRestrictionMessage } from "@/lib/messages/get-message-restriction-message";

export type ConversationMessagingState = {
  composerDisabledReason: string | null;
  blockState: "none" | "blocked_by_me" | "blocked_by_other";
};

export async function getConversationMessagingState(
  viewerId: string,
  otherUserId: string
): Promise<ConversationMessagingState> {
  const restrictionMessage = await getMessageRestrictionMessage(viewerId);
  if (restrictionMessage) {
    return {
      composerDisabledReason: restrictionMessage,
      blockState: "none"
    };
  }

  const blockState = await getMessageBlockState(viewerId, otherUserId);

  if (blockState === "blocked_by_me") {
    return {
      composerDisabledReason: "Bạn đã chặn người dùng này.",
      blockState
    };
  }

  if (blockState === "blocked_by_other") {
    return {
      composerDisabledReason: "Không thể gửi tin nhắn.",
      blockState
    };
  }

  return { composerDisabledReason: null, blockState: "none" };
}
