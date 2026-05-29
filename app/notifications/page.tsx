import { redirect } from "next/navigation";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";
import { ErrorState } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { resolveInitialNotifications } from "@/lib/notifications/resolve-initial-notifications";
import { getUnreadNotificationCount, getUserNotifications } from "@/lib/supabase/notifications";

export const dynamic = "force-dynamic";

export default async function NotificationsRoutePage() {
  const { user } = await getCurrentProfile();

  if (!user) {
    redirect("/login?next=/notifications");
  }

  const result = await Promise.all([
    getUserNotifications({ userId: user.id, limit: 20, offset: 0, group: "all" }),
    getUnreadNotificationCount(user.id)
  ])
    .then(([items, unreadCount]) => {
      const resolvedItems = resolveInitialNotifications(user.id, items, {
        allowMock: process.env.NODE_ENV === "development"
      });
      const usingMockData = items.length === 0 && resolvedItems.length > 0;

      return {
        error: null as string | null,
        items: resolvedItems,
        unreadCount: usingMockData
          ? resolvedItems.filter((item) => !item.read_at).length
          : unreadCount,
        usingMockData
      };
    })
    .catch((error) => ({
      error: error instanceof Error ? error.message : "Không thể tải danh sách thông báo.",
      items: [],
      unreadCount: 0,
      usingMockData: false
    }));

  if (result.error) {
    return (
      <section className="space-y-4">
        <ErrorState message={result.error} title="Không tải được thông báo" />
      </section>
    );
  }

  return (
    <NotificationsPage
      initialItems={result.items}
      initialUnreadCount={result.unreadCount}
      usingMockData={result.usingMockData}
    />
  );
}
