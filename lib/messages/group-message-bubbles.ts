import type { ConversationMessage } from "@/types/messages";

const GROUP_WINDOW_MS = 5 * 60 * 1000;

export type MessageGroupMeta = {
  groupedWithPrevious: boolean;
  groupedWithNext: boolean;
  showTimestamp: boolean;
};

export function shouldGroupMessages(
  current: ConversationMessage,
  other: ConversationMessage
): boolean {
  if (current.isOwn !== other.isOwn) {
    return false;
  }
  const a = new Date(current.createdAt).getTime();
  const b = new Date(other.createdAt).getTime();
  return Math.abs(a - b) <= GROUP_WINDOW_MS;
}

export function getMessageGroupMeta(
  messages: ConversationMessage[],
  index: number
): MessageGroupMeta {
  const current = messages[index];
  const previous = index > 0 ? messages[index - 1] : null;
  const next = index < messages.length - 1 ? messages[index + 1] : null;

  const groupedWithPrevious =
    previous != null && shouldGroupMessages(current, previous);
  const groupedWithNext = next != null && shouldGroupMessages(current, next);

  return {
    groupedWithPrevious,
    groupedWithNext,
    showTimestamp: !groupedWithNext
  };
}
