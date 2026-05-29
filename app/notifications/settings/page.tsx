import { redirect } from "next/navigation";
import { NotificationSettingsPage } from "@/components/notifications/NotificationSettingsPage";
import { ErrorState } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getNotificationPreferences } from "@/lib/supabase/notifications";

export const dynamic = "force-dynamic";

export default async function NotificationSettingsRoutePage() {
  const { user } = await getCurrentProfile();

  if (!user) {
    redirect("/login?next=/notifications/settings");
  }

  try {
    const preferences = await getNotificationPreferences(user.id);
    return <NotificationSettingsPage initialPreferences={preferences} />;
  } catch (error) {
    return (
      <ErrorState
        message={
          error instanceof Error ? error.message : "Không thể tải cài đặt thông báo."
        }
        title="Không tải được cài đặt"
      />
    );
  }
}
