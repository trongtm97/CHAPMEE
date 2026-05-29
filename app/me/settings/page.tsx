import { redirect } from "next/navigation";
import { EditProfileForm } from "@/components/me/EditProfileForm";
import { MobileBackHeader } from "@/components/me/MobileBackHeader";
import { getProfileSettingsData } from "@/lib/profile/updateProfile";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const dynamic = "force-dynamic";

export default async function MeSettingsPage() {
  const { user } = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/me/settings");
  }

  const settings = await getProfileSettingsData();

  if (!settings) {
    redirect("/login?next=/me/settings");
  }

  return (
    <section className="space-y-3">
      <MobileBackHeader fallbackHref="/me" title="Sửa hồ sơ" variant="compact" />
      <EditProfileForm
        avatarUrl={settings.avatarUrl}
        bio={settings.bio}
        displayName={settings.displayName}
        email={settings.email}
        userId={settings.userId}
        username={settings.username}
      />
    </section>
  );
}
