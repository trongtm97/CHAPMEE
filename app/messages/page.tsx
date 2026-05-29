import { Suspense } from "react";
import { MessagesShell } from "@/components/messages/MessagesShell";
import { InboxPage } from "@/components/messages/InboxPage";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getInboxConversations } from "@/lib/messages/get-inbox";
import { getPendingMessageRequests } from "@/lib/messages/get-message-requests";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function MessagesPage({ searchParams }: PageProps) {
  const { profile } = await getCurrentUser();
  const query = await searchParams;
  const requestsTab = query.tab === "requests";

  const [conversations, requests] = await Promise.all([
    getInboxConversations(profile!.id),
    getPendingMessageRequests(profile!.id)
  ]);

  return (
    <MessagesShell
      conversations={conversations}
      currentUserId={profile!.id}
      requests={requests}
      requestsTab={requestsTab}
    >
      <Suspense fallback={null}>
        <InboxPage />
      </Suspense>
    </MessagesShell>
  );
}
