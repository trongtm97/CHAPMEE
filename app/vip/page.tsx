import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, SectionHeader } from "@/components/ui";
import { VipPurchasePanel } from "@/components/vip/VipPurchasePanel";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getVipPageData } from "@/lib/monetization/vip";

export const dynamic = "force-dynamic";

export default async function VipPage() {
  const [{ user }, config] = await Promise.all([
    getCurrentUser(),
    getMonetizationConfig({ includePrivate: true })
  ]);
  if (!user) redirect("/login?next=/vip");

  const vipData = await getVipPageData(user.id);
  if (!vipData.enabled) {
    return (
      <section className="space-y-4">
        <SectionHeader title="VIP" />
        <Card>
          <p className="text-sm text-zinc-300">VIP hiện đang tắt bởi admin.</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/me">
          ← Me
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">ChapMee VIP</h1>
      </div>

      {vipData.vipStatus?.isActive ? (
        <Card className="space-y-2">
          <p className="text-base font-semibold text-white">Bạn đang là VIP</p>
          <p className="text-sm text-zinc-300">
            Gói: {vipData.vipStatus.plan?.name ?? "VIP"}
          </p>
          <p className="text-sm text-zinc-300">
            Hết hạn:{" "}
            {vipData.vipStatus.subscription?.expires_at
              ? new Date(vipData.vipStatus.subscription.expires_at).toLocaleString()
              : "N/A"}
          </p>
        </Card>
      ) : null}

      <VipPurchasePanel
        mockPurchaseEnabled={Boolean(config.settings["vip_subscription.mock_purchase_enabled"])}
        plans={vipData.plans}
        testMode={Boolean(config.settings["monetization.test_mode"])}
      />
    </section>
  );
}
