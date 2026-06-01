import { redirect } from "next/navigation";
import { MobileBackHeader } from "@/components/me/MobileBackHeader";
import { ProfilePrivacySettingsForm } from "@/components/profile/ProfilePrivacySettings";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { ensureProfilePrivacySettings } from "@/lib/profile/get-profile-privacy";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";
import { getShareUrl } from "@/lib/share/getShareUrl";

export const dynamic = "force-dynamic";

export default async function MePrivacySettingsPage() {
  const { user, profile } = await getCurrentUser();

  if (!user || !profile) {
    redirect("/login?next=/me/settings/privacy");
  }

  const settings = await ensureProfilePrivacySettings(profile.id);
  const profileUrl = profile.username
    ? getShareUrl(getProfileUrlOrFallback(profile.username))
    : null;

  return (
    <section className="space-y-4 pb-8">
      <MobileBackHeader fallbackHref="/me" title="Hồ sơ công khai" variant="compact" />
      <div className="space-y-1">
        <h1 className="text-lg font-black text-white">Quyền riêng tư hồ sơ</h1>
        <p className="text-sm text-zinc-400">
          Chọn nội dung hiển thị với mọi người trên hồ sơ công khai. Email, coin và ví
          không bao giờ được hiển thị.
        </p>
      </div>
      <ProfilePrivacySettingsForm profileUrl={profileUrl} settings={settings} />
    </section>
  );
}
