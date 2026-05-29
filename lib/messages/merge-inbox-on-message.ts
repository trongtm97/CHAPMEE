import type { InboxConversationItem } from "@/types/messages";

function previewText(body: string) {
  const trimmed = body.trim();
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

export function mergeInboxOnMessageInsert(
  items: InboxConversationItem[],
  input: {
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: string;
    currentUserId: string;
    activeConversationId: string | null;
  }
): InboxConversationItem[] {
  const idx = items.findIndex((c) => c.id === input.conversationId);
  if (idx < 0) {
    return items;
  }

  const item = items[idx];
  const isFromOther = input.senderId !== input.currentUserId;
  const isActive = input.activeConversationId === input.conversationId;
  const unreadDelta =
    isFromOther && !isActive ? item.unreadCount + 1 : isActive ? 0 : item.unreadCount;

  const updated: InboxConversationItem = {
    ...item,
    lastMessagePreview: previewText(input.body),
    lastMessageAt: input.createdAt,
    unreadCount: isActive ? 0 : unreadDelta
  };

  const rest = items.filter((_, i) => i !== idx);
  return [updated, ...rest];
}

export function clearInboxUnread(
  items: InboxConversationItem[],
  conversationId: string
): InboxConversationItem[] {
  return items.map((item) =>
    item.id === conversationId ? { ...item, unreadCount: 0 } : item
  );
}
