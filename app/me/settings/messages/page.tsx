import { redirect } from "next/navigation";
import { MobileBackHeader } from "@/components/me/MobileBackHeader";
import { BlockedUsersList } from "@/components/messages/BlockedUsersList";
import { MessagePrivacySettingsForm } from "@/components/messages/MessagePrivacySettings";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getBlockedUsers } from "@/lib/messages/get-blocked-users";
import { ensureMessagePrivacySettings } from "@/lib/messages/get-privacy-settings";

export const dynamic = "force-dynamic";

export default async function MessageSettingsPage() {
  const { user, profile } = await getCurrentUser();

  if (!user || !profile) {
    redirect("/login?next=/me/settings/messages");
  }

  const [settings, blockedUsers] = await Promise.all([
    ensureMessagePrivacySettings(profile.id),
    getBlockedUsers(profile.id)
  ]);

  return (
    <section className="space-y-4 pb-8">
      <MobileBackHeader fallbackHref="/me" title="Cài đặt" variant="compact" />
      <MessagePrivacySettingsForm settings={settings} />
      <BlockedUsersList users={blockedUsers} />
    </section>
  );
}
