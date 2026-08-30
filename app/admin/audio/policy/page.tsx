import Link from "next/link";
import { AudioPolicyForm } from "@/src/components/admin/audio/AudioPolicyForm";
import { ErrorState } from "@/components/ui";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { getAudioPolicySettings } from "@/lib/settings/audio-policy-settings";

export const dynamic = "force-dynamic";

export default async function AdminAudioPolicyPage() {
  const guard = await requireAdminSettingsAccess("/admin/audio/policy");
  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />;
  }
  const settings = await getAudioPolicySettings();
  return (
    <section className="space-y-5">
      <div>
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin/audio">← Audio Center</Link>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Audio policy</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Story-level only policy. Không có option chapter-level audio trong trang này.
        </p>
      </div>
      <AudioPolicyForm settings={settings} />
    </section>
  );
}
