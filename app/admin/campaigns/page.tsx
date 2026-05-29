import Link from "next/link";
import { CampaignManager } from "@/components/admin/campaigns/CampaignManager";
import { ErrorState } from "@/components/ui";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getCampaignsForAdmin, getSponsorsForAdmin } from "@/lib/supabase/campaigns";
import { getChallenges } from "@/lib/supabase/challenges";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  const guard = await requireAdminSettingsAccess("/admin/campaigns");
  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <h1 className="text-3xl font-bold">Không có quyền truy cập</h1>
        <ErrorState message={guard.error} title="Không có quyền truy cập admin" variant="danger" />
      </section>
    );
  }

  const { settings } = await getMonetizationConfig({
    includePrivate: true,
    useCache: false
  });
  const sponsorshipEnabled =
    Boolean(settings["monetization.enabled"]) &&
    (Boolean(settings["sponsored_challenge.enabled"]) ||
      Boolean(settings["brand_campaigns.enabled"]));

  const [sponsors, campaigns, challenges] = await Promise.all([
    getSponsorsForAdmin(),
    getCampaignsForAdmin(),
    getChallenges()
  ]);

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Brand Campaigns</h1>
        <p className="text-sm text-zinc-400">
          Flag status: {sponsorshipEnabled ? "enabled" : "disabled"}
        </p>
      </div>

      {sponsors.error || campaigns.error ? (
        <ErrorState
          message={sponsors.error ?? campaigns.error ?? "Không thể tải campaign manager."}
          title="Lỗi dữ liệu chiến dịch"
        />
      ) : (
        <CampaignManager
          campaigns={campaigns.data}
          challenges={challenges}
          sponsors={sponsors.data}
        />
      )}
    </section>
  );
}
