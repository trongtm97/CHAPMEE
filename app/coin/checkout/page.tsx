import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card, ErrorState, SectionHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getActiveCoinPacks } from "@/lib/supabase/coin-packs";
import { getEnabledPaymentProviderSettings } from "@/lib/supabase/payment-provider-settings";
import { listCheckoutSessionsForUser } from "@/lib/supabase/checkout-sessions";
import { createCheckoutForCurrentUserAction, simulateCheckoutPaidByAdminAction } from "@/lib/payments/actions";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getRewardedAdsAvailability } from "@/lib/monetization/rewarded-ads";
import { RewardedAdButton } from "@/components/ads/RewardedAdButton";
import { getSePayConfig } from "@/lib/payments/sepay-config";
import { getPurchaseUiPolicyForRequest } from "@/lib/payments/purchase-mode";

export const dynamic = "force-dynamic";

function isPurchaseEnabled(settings: Record<string, unknown>) {
  return (
    Boolean(settings["monetization.enabled"]) &&
    Boolean(settings["coin.enabled"]) &&
    Boolean(settings["coin.purchase_enabled"]) &&
    Boolean(settings["payments.enabled"]) &&
    Boolean(settings["monetization.show_money_ui_to_users"])
  );
}

export default async function CoinCheckoutPage() {
  async function submitCheckout(formData: FormData) {
    "use server";
    await createCheckoutForCurrentUserAction(formData);
  }

  async function simulateCheckoutPaid(formData: FormData) {
    "use server";
    await simulateCheckoutPaidByAdminAction(formData);
  }

  const [{ user, profile }, config] = await Promise.all([
    getCurrentUser(),
    getMonetizationConfig({ includePrivate: true })
  ]);
  const purchasePolicy = await getPurchaseUiPolicyForRequest();

  if (!user) {
    redirect("/login?next=/coin/checkout");
  }

  if (
    !isPurchaseEnabled(config.settings as Record<string, unknown>) ||
    !purchasePolicy.showSePayTopUp
  ) {
    return (
      <section className="space-y-4">
        <SectionHeader title="Nạp Coin" />
        {purchasePolicy.showStoreBilling ? (
          <ErrorState
            message="Build nay dung in-app billing. Vui long mua coin trong ung dung."
            title="In-app purchase only"
          />
        ) : (
          <ErrorState
            message="Coin purchase đang tắt hoặc không khả dụng trên platform hiện tại."
            title="Purchase disabled"
          />
        )}
      </section>
    );
  }

  const [packs, providers, sessions] = await Promise.all([
    getActiveCoinPacks(),
    getEnabledPaymentProviderSettings(),
    listCheckoutSessionsForUser(user.id, 10)
  ]);
  const rewardedAdsAvailability = await getRewardedAdsAvailability({
    userId: user.id,
    role: profile?.role
  });
  const sepay = getSePayConfig();
  const sepayEnabledByFlags = Boolean(config.settings["payments.provider_sepay_enabled"]);
  const sepayProvider = providers.data.find((p) => p.provider_key === "sepay" && p.enabled);
  const canUseSePay = Boolean(sepayProvider) && sepayEnabledByFlags && sepay.ready;

  return (
    <section className="space-y-6">
      <div>
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/me"
        >
          ← Me
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Nạp coin</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Dùng coin để mở chương, tặng quà và ủng hộ tác giả.
        </p>
      </div>

      {packs.error || providers.error ? (
        <ErrorState
          message={packs.error ?? providers.error}
          title="Could not load checkout options"
        />
      ) : null}

      <Card className="space-y-4">
        <SectionHeader title="Chọn gói coin" />
        {rewardedAdsAvailability.enabled ? (
          <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/5 p-3">
            <p className="mb-2 text-sm font-semibold text-cyan-100">Nhận coin miễn phí</p>
            <RewardedAdButton
              availability={rewardedAdsAvailability}
              placement="coin_checkout"
            />
          </div>
        ) : null}
        {packs.data.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa có coin pack active.</p>
        ) : (
          <div className="space-y-3">
            {packs.data.map((pack) => (
              <form
                action={submitCheckout}
                className="space-y-2 rounded-xl border border-white/10 p-3"
                key={pack.id}
              >
                <input name="coin_pack_id" type="hidden" value={pack.id} />
                <div className="flex items-center gap-2">
                  <p className="text-base font-black text-white">{pack.name}</p>
                  {pack.label ? (
                    <span className="rounded-full border border-cyan-300/40 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                      {pack.label}
                    </span>
                  ) : null}
                  {pack.badge_text ? (
                    <span className="rounded-full border border-amber-300/40 px-2 py-0.5 text-xs font-semibold text-amber-200">
                      {pack.badge_text}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-zinc-300">
                  {pack.base_coin_amount.toLocaleString("vi-VN")} coin
                </p>
                {pack.bonus_coin_amount > 0 ? (
                  <p className="text-sm text-cyan-200">
                    +{pack.bonus_coin_amount.toLocaleString("vi-VN")} coin bonus - Tặng thêm{" "}
                    {pack.bonus_percent}%
                  </p>
                ) : null}
                <p className="text-sm text-zinc-200">
                  Tổng {pack.total_coin_amount.toLocaleString("vi-VN")} coin
                </p>
                <p className="text-sm text-zinc-300">
                  {pack.price_vnd.toLocaleString("vi-VN")} VND
                </p>
                <input name="provider" type="hidden" value="sepay" />
                {!canUseSePay ? (
                  <p className="text-sm text-amber-300">
                    SePay tam thoi chua san sang. Vui long lien he admin.
                  </p>
                ) : null}
                <Button disabled={!canUseSePay} type="submit">
                  Nạp coin bằng SePay
                </Button>
              </form>
            ))}
          </div>
        )}
        <p className="text-xs text-zinc-400">
          Bonus coin là coin khuyến mãi và có thể áp dụng theo chính sách của ChapMee.
        </p>
      </Card>

      <Card className="space-y-3">
        <SectionHeader subtitle="Mock paid chỉ dành cho admin/founder + test mode." title="Checkout sessions của bạn" />
        {sessions.data.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa có checkout session.</p>
        ) : (
          <div className="space-y-2">
            {sessions.data.map((session) => (
              <div className="rounded-xl border border-white/10 p-3" key={session.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-zinc-100">{session.provider}</span>
                  <span className="text-zinc-300">{session.status}</span>
                  <span className="text-zinc-300">
                    {session.amount_vnd.toLocaleString("vi-VN")} VND
                  </span>
                </div>
                {Boolean(config.settings["monetization.test_mode"]) &&
                (profile?.role === "admin" || profile?.role === "founder") ? (
                  <form action={simulateCheckoutPaid} className="mt-2">
                    <input
                      name="checkout_session_id"
                      type="hidden"
                      value={session.id}
                    />
                    <Button type="submit" variant="secondary">
                      Simulate paid (mock)
                    </Button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
