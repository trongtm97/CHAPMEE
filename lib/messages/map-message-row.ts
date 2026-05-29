import type { ConversationMessage, MessageDisplayState } from "@/types/messages";

export type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  body_safety_status: string;
  created_at: string;
  deleted_at: string | null;
  status: string;
};

export function mapMessageRow(
  msg: MessageRow,
  userId: string,
  filterSensitive: boolean
): ConversationMessage | null {
  const isOwn = msg.sender_id === userId;
  let displayState: MessageDisplayState = "normal";

  if (
    msg.status === "deleted_by_moderator" ||
    (msg.deleted_at && msg.body_safety_status === "hidden")
  ) {
    displayState = "removed_by_moderator";
  } else if (msg.deleted_at || msg.status === "deleted") {
    displayState = "deleted";
  } else if (msg.body_safety_status === "hidden") {
    displayState = "removed_by_moderator";
  } else if (msg.body_safety_status === "review") {
    if (!isOwn) {
      return null;
    }
    displayState = "review";
  } else if (
    filterSensitive &&
    !isOwn &&
    (msg.body_safety_status === "warning" || msg.body_safety_status === "hidden")
  ) {
    return null;
  }

  return {
    id: msg.id,
    senderId: msg.sender_id,
    body: msg.body,
    bodySafetyStatus: msg.body_safety_status as ConversationMessage["bodySafetyStatus"],
    createdAt: msg.created_at,
    isOwn,
    displayState,
    deliveryStatus: "sent"
  };
}
