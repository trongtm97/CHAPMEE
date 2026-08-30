import Link from "next/link";
import { MonetizationSettingsPanel } from "@/components/admin/monetization/MonetizationSettingsPanel";
import { ErrorState } from "@/components/ui";
import {
  getMonetizationConfig,
  MONETIZATION_SETTING_DEFINITIONS
} from "@/lib/monetization/config";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { getCoinPacksForAdmin } from "@/lib/data/coin-packs";
import { getPaymentProviderSettings } from "@/lib/data/payment-provider-settings";
import { listCheckoutSessionsForAdmin } from "@/lib/data/checkout-sessions";
import { CoinPackManager } from "@/components/admin/monetization/CoinPackManager";
import { PaymentProviderSettings } from "@/components/admin/monetization/PaymentProviderSettings";
import { GiftCatalogManager } from "@/components/admin/monetization/GiftCatalogManager";
import { getVirtualGiftsForAdmin } from "@/lib/data/virtual-gifts";
import { VipPlanManager } from "@/components/admin/monetization/VipPlanManager";
import { listVipPlansForAdmin } from "@/lib/data/vip";
import { listPaymentProviderProducts } from "@/lib/data/payment-provider-products";
import { ProductMappingManager } from "@/components/admin/monetization/ProductMappingManager";
import { GooglePlaySettings } from "@/components/admin/monetization/GooglePlaySettings";

export const dynamic = "force-dynamic";

export default async function AdminMonetizationPage() {
  const guard = await requireAdminSettingsAccess("/admin/monetization");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal">
            Không có quyền truy cập
          </h1>
        </div>
        <ErrorState
          message={guard.error}
          title="Không có quyền truy cập admin"
          variant="danger"
        />
      </section>
    );
  }

  const config = await getMonetizationConfig({
    includePrivate: true,
    useCache: false
  });
  const [coinPacks, providers, checkouts, vipPlans, productMappings] = await Promise.all([
    getCoinPacksForAdmin(),
    getPaymentProviderSettings(),
    listCheckoutSessionsForAdmin(20),
    listVipPlansForAdmin(),
    listPaymentProviderProducts()
  ]);
  const gifts = await getVirtualGiftsForAdmin();

  return (
    <section className="space-y-6">
      <div>
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin"
        >
          ← Admin
        </Link>
        <p className="mt-5 text-sm font-medium uppercase tracking-wide text-cyan-300">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">
          Monetization Config
        </h1>
      </div>

      <MonetizationSettingsPanel
        definitions={MONETIZATION_SETTING_DEFINITIONS}
        initialSettings={config.settings}
        updatedAt={config.updatedAt}
      />
      <CoinPackManager packs={coinPacks.data} />
      <GiftCatalogManager gifts={gifts.data} />
      <VipPlanManager plans={vipPlans.data} />
      <PaymentProviderSettings providers={providers.data} />
      <GooglePlaySettings settings={config.settings} />
      <ProductMappingManager coinPacks={coinPacks.data} mappings={productMappings.data} />
      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-lg font-black text-white">Phiên thanh toán g?n dây</h2>
        {checkouts.error ? (
          <ErrorState message={checkouts.error} title="Không tải được phiên thanh toán" />
        ) : (
          <div className="space-y-2">
            {checkouts.data.map((session) => (
              <div
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
                key={session.id}
              >
                <span className="text-zinc-100">{session.id.slice(0, 8)}</span>
                <span className="text-zinc-300">{session.provider}</span>
                <span className="text-zinc-300">{session.status}</span>
                <span className="text-zinc-300">
                  {session.amount_vnd.toLocaleString("vi-VN")} VND
                </span>
              </div>
            ))}
            {checkouts.data.length === 0 ? (
              <p className="text-sm text-zinc-400">Chua có checkout session.</p>
            ) : null}
          </div>
        )}
      </section>
    </section>
  );
}
