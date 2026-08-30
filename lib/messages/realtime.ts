"use client";

import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload
} from "@/lib/db/types";
import { createClient } from "@/lib/data/client";
import { mapMessageRow, type MessageRow } from "@/lib/messages/map-message-row";
import type { ConversationMessage } from "@/types/messages";

export type RealtimeMessagePayload = MessageRow;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asMessageRow(value: unknown): MessageRow | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.sender_id !== "string" ||
    typeof value.body !== "string"
  ) {
    return null;
  }
  return value as MessageRow;
}

export type ConversationMessageHandlers = {
  onInsert: (message: ConversationMessage) => void;
  onUpdate: (message: ConversationMessage) => void;
};

export function subscribeToConversationMessages(
  conversationId: string,
  userId: string,
  filterSensitive: boolean,
  handlers: ConversationMessageHandlers
): () => void {
  const db = createClient();
  const channelName = `messages:${conversationId}`;

  const handleRow = (
    row: MessageRow,
    kind: "insert" | "update"
  ) => {
    const mapped = mapMessageRow(row, userId, filterSensitive);
    if (!mapped) {
      return;
    }
    if (kind === "insert") {
      handlers.onInsert(mapped);
    } else {
      handlers.onUpdate(mapped);
    }
  };

  const channel = db
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const row = asMessageRow(payload.new);
        if (row) {
          handleRow(row, "insert");
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const row = asMessageRow(payload.new);
        if (row) {
          handleRow(row, "update");
        }
      }
    )
    .subscribe();

  return () => {
    void db.removeChannel(channel);
  };
}

export type InboxMessageInsertPayload = MessageRow & {
  conversation_id: string;
};

export type InboxHandlers = {
  onMessageInsert: (payload: InboxMessageInsertPayload) => void;
  onConversationUpdate: (payload: {
    id: string;
    last_message_at: string | null;
    last_message_preview: string | null;
  }) => void;
  onParticipantReadUpdate: (payload: {
    conversation_id: string;
    user_id: string;
    last_read_at: string | null;
  }) => void;
};

export function subscribeToOtherParticipantRead(
  conversationId: string,
  otherUserId: string,
  onRead: (lastReadAt: string | null) => void
): () => void {
  const db = createClient();

  const channel = db
    .channel(`read:${conversationId}:${otherUserId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "conversation_participants",
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const row = payload.new;
        if (isRecord(row) && row.user_id === otherUserId) {
          onRead((row.last_read_at as string | null) ?? null);
        }
      }
    )
    .subscribe();

  return () => {
    void db.removeChannel(channel);
  };
}

export function subscribeToInbox(
  userId: string,
  handlers: InboxHandlers
): () => void {
  const db = createClient();

  const channel: RealtimeChannel = db
    .channel(`inbox:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages"
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const row = asMessageRow(payload.new);
        if (row && isRecord(payload.new) && typeof payload.new.conversation_id === "string") {
          handlers.onMessageInsert({
            ...row,
            conversation_id: payload.new.conversation_id
          });
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "conversations"
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const row = payload.new;
        if (isRecord(row) && typeof row.id === "string") {
          handlers.onConversationUpdate({
            id: row.id,
            last_message_at: (row.last_message_at as string | null) ?? null,
            last_message_preview: (row.last_message_preview as string | null) ?? null
          });
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "conversation_participants"
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const row = payload.new;
        if (
          isRecord(row) &&
          typeof row.conversation_id === "string" &&
          typeof row.user_id === "string" &&
          row.user_id !== userId
        ) {
          handlers.onParticipantReadUpdate({
            conversation_id: row.conversation_id,
            user_id: row.user_id,
            last_read_at: (row.last_read_at as string | null) ?? null
          });
        }
      }
    )
    .subscribe();

  return () => {
    void db.removeChannel(channel);
  };
}

/** Gộp tin vào state, chống duplicate và reconcile optimistic. */
export function mergeConversationMessages(
  prev: ConversationMessage[],
  incoming: ConversationMessage,
  options?: { replaceTempId?: string }
): ConversationMessage[] {
  const byId = prev.findIndex((m) => m.id === incoming.id);
  if (byId >= 0) {
    return prev.map((m, i) =>
      i === byId ? { ...incoming, deliveryStatus: m.deliveryStatus ?? "sent" } : m
    );
  }

  if (options?.replaceTempId) {
    const tempIdx = prev.findIndex((m) => m.id === options.replaceTempId);
    if (tempIdx >= 0) {
      return prev.map((m, i) =>
        i === tempIdx ? { ...incoming, deliveryStatus: "sent" } : m
      );
    }
  }

  const optimisticIdx = prev.findIndex(
    (m) =>
      m.deliveryStatus === "sending" &&
      m.isOwn &&
      m.body === incoming.body &&
      incoming.isOwn
  );
  if (optimisticIdx >= 0) {
    return prev.map((m, i) =>
      i === optimisticIdx ? { ...incoming, deliveryStatus: "sent" } : m
    );
  }

  return [...prev, incoming];
}

export function createOptimisticMessage(
  tempId: string,
  senderId: string,
  body: string
): ConversationMessage {
  return {
    id: tempId,
    senderId,
    body,
    bodySafetyStatus: "clean",
    createdAt: new Date().toISOString(),
    isOwn: true,
    displayState: "normal",
    deliveryStatus: "sending",
    clientId: tempId
  };
}

export function markMessageFailed(
  messages: ConversationMessage[],
  tempId: string
): ConversationMessage[] {
  return messages.map((m) =>
    m.id === tempId ? { ...m, deliveryStatus: "failed" } : m
  );
}

export function removeMessageById(
  messages: ConversationMessage[],
  id: string
): ConversationMessage[] {
  return messages.filter((m) => m.id !== id);
}
