import { redirect } from "next/navigation";
import { ConversationForbidden } from "@/components/messages/ConversationForbidden";
import { ConversationPage } from "@/components/messages/ConversationPage";
import { MessagesShell } from "@/components/messages/MessagesShell";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getConversationDetail } from "@/lib/messages/get-conversation";
import { getInboxConversations } from "@/lib/messages/get-inbox";
import { getPendingMessageRequests } from "@/lib/messages/get-message-requests";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function ConversationDetailPage({ params }: PageProps) {
  const { conversationId } = await params;
  const { user, profile } = await getCurrentUser();

  if (!user || !profile) {
    redirect(`/login?next=/messages/${conversationId}`);
  }

  const [conversation, conversations, requests] = await Promise.all([
    getConversationDetail(conversationId, profile.id),
    getInboxConversations(profile.id),
    getPendingMessageRequests(profile.id)
  ]);

  return (
    <MessagesShell
      activeConversationId={conversation ? conversationId : null}
      conversations={conversations}
      currentUserId={profile.id}
      requests={requests}
    >
      {conversation ? (
        <ConversationPage conversation={conversation} />
      ) : (
        <ConversationForbidden />
      )}
    </MessagesShell>
  );
}
