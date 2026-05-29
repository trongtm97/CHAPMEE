"use client";

import { useCallback, useEffect, useState } from "react";
import { ConversationHeader } from "@/components/messages/ConversationHeader";
import { useInboxPatch } from "@/components/messages/inbox-patch-context";
import { MessageComposer } from "@/components/messages/MessageComposer";
import { MessageList } from "@/components/messages/MessageList";
import { markConversationReadAction } from "@/lib/actions/messages";
import { dispatchMessageUnreadRefresh } from "@/components/messages/message-unread-context";
import {
  mergeConversationMessages,
  subscribeToConversationMessages,
  subscribeToOtherParticipantRead
} from "@/lib/messages/realtime";
import type { ConversationDetail, ConversationMessage } from "@/types/messages";

type ConversationPageProps = {
  conversation: ConversationDetail;
};

function isDocumentFocused() {
  return typeof document !== "undefined" && document.hasFocus();
}

export function ConversationPage({ conversation }: ConversationPageProps) {
  const inboxPatch = useInboxPatch();
  const [messages, setMessages] = useState<ConversationMessage[]>(conversation.messages);
  const [otherLastReadAt, setOtherLastReadAt] = useState(
    conversation.otherUser.lastReadAt
  );
  const [retryPrefill, setRetryPrefill] = useState<string | null>(null);

  const markRead = useCallback(async () => {
    await markConversationReadAction(conversation.id);
    inboxPatch?.patchInboxUnread(conversation.id);
    dispatchMessageUnreadRefresh();
  }, [conversation.id, inboxPatch]);

  useEffect(() => {
    setMessages(conversation.messages);
    setOtherLastReadAt(conversation.otherUser.lastReadAt);
    void markRead();
  }, [conversation.id, conversation.messages, conversation.otherUser.lastReadAt, markRead]);

  useEffect(() => {
    const unsubscribe = subscribeToConversationMessages(
      conversation.id,
      conversation.currentUserId,
      conversation.filterSensitiveMessages,
      {
        onInsert: (incoming) => {
          setMessages((prev) => mergeConversationMessages(prev, incoming));
          if (isDocumentFocused()) {
            void markRead();
          }
        },
        onUpdate: (updated) => {
          setMessages((prev) => mergeConversationMessages(prev, updated));
        }
      }
    );

    return unsubscribe;
  }, [
    conversation.id,
    conversation.currentUserId,
    conversation.filterSensitiveMessages,
    markRead
  ]);

  useEffect(() => {
    return subscribeToOtherParticipantRead(
      conversation.id,
      conversation.otherUser.id,
      setOtherLastReadAt
    );
  }, [conversation.id, conversation.otherUser.id]);

  const handleOptimistic = useCallback((message: ConversationMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  const handleConfirmed = useCallback(
    (tempId: string, serverMessage: ConversationMessage) => {
      setMessages((prev) =>
        mergeConversationMessages(prev, serverMessage, { replaceTempId: tempId })
      );
      inboxPatch?.patchInboxUnread(conversation.id);
    },
    [conversation.id, inboxPatch]
  );

  const handleFailed = useCallback((tempId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, deliveryStatus: "failed" } : m))
    );
  }, []);

  const handleRemoveOptimistic = useCallback((tempId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ConversationHeader
        avatarUrl={conversation.otherUser.avatarUrl}
        blockState={conversation.messaging.blockState}
        conversationId={conversation.id}
        displayName={conversation.otherUser.displayName}
        isMuted={conversation.participant.isMuted}
        otherUserId={conversation.otherUser.id}
        username={conversation.otherUser.username}
      />
      <MessageList
        conversationId={conversation.id}
        messages={messages}
        onRetryFailed={(text, tempId) => {
          handleRemoveOptimistic(tempId);
          setRetryPrefill(text);
        }}
        otherLastReadAt={otherLastReadAt}
        otherUserId={conversation.otherUser.id}
      />
      <MessageComposer
        conversationId={conversation.id}
        currentUserId={conversation.currentUserId}
        disabledReason={conversation.messaging.composerDisabledReason}
        onConfirmed={handleConfirmed}
        onFailed={handleFailed}
        onOptimistic={handleOptimistic}
        onPrefillConsumed={() => setRetryPrefill(null)}
        onRemoveOptimistic={handleRemoveOptimistic}
        onSendSuccess={() => {
          void markRead();
        }}
        prefillBody={retryPrefill}
      />
    </div>
  );
}
