import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, ErrorState, SectionHeader, Button } from "@/components/ui";
import { TopupPackageList } from "@/components/coin/TopupPackageList";
import { RewardedAdButton } from "@/components/ads/RewardedAdButton";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getRewardedAdsAvailability } from "@/lib/monetization/rewarded-ads";
import {
  createCheckoutForCurrentUserAction,
  simulateCheckoutPaidByAdminAction
} from "@/lib/payments/actions";
import { getSePayRuntimeConfig } from "@/lib/payments/sepay-config";
import { getPurchaseUiPolicyForRequest } from "@/lib/payments/purchase-mode";
import { getEnabledPaymentProviderSettings } from "@/lib/data/payment-provider-settings";
import { listCheckoutSessionsForUser } from "@/lib/data/checkout-sessions";
import { RecommendationTicketsInfo } from "@/components/rankings/RecommendationTicketsInfo";
import { RecommendationTicketBalance } from "@/components/wallet/RecommendationTicketBalance";
import { getRecommendationTicketsConfig } from "@/lib/recommendations/config";
import { getRecommendationTicketBalance } from "@/lib/recommendations/wallet";
import { getActiveTopupPackages } from "@/lib/topup-packages/read";

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

export default async function CoinCheckoutPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  async function submitCheckout(formData: FormData) {
    "use server";
    const result = await createCheckoutForCurrentUserAction(formData);
    if (result && typeof result === "object" && "ok" in result && !result.ok) {
      redirect(
        `/coin/checkout?error=${encodeURIComponent(
          result.error ?? "Không tạo được checkout."
        )}`
      );
    }
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
  const query = await searchParams;
  const checkoutError =
    typeof query.error === "string" && query.error.trim()
      ? query.error.trim()
      : null;

  if (!user) {
    redirect("/login?next=/coin/checkout");
  }

  if (!isPurchaseEnabled(config.settings as Record<string, unknown>)) {
    return (
      <section className="space-y-4">
        <SectionHeader title="Nạp Xu" />
        {checkoutError ? (
          <ErrorState message={checkoutError} title="Không tạo được giao dịch nạp" />
        ) : null}
        {purchasePolicy.showStoreBilling ? (
          <ErrorState
            message="Build này dùng in-app billing. Vui lòng mua Xu trong ứng dụng."
            title="In-app purchase only"
          />
        ) : purchasePolicy.hideTopUp ? (
          <ErrorState
            message="Nạp Xu đang bị ẩn trên platform hiện tại."
            title="Purchase disabled"
          />
        ) : (
          <ErrorState
            message="Nạp Xu đang tắt hoặc không khả dụng trên platform hiện tại."
            title="Purchase disabled"
          />
        )}
      </section>
    );
  }

  const [packagesResult, providers, sessions, ticketBalance] = await Promise.all([
    getActiveTopupPackages(),
    getEnabledPaymentProviderSettings(),
    listCheckoutSessionsForUser(user.id, 10),
    getRecommendationTicketBalance(user.id)
  ]);
  const ticketConfig = getRecommendationTicketsConfig();
  const rewardedAdsAvailability = await getRewardedAdsAvailability({
    userId: user.id,
    role: profile?.role
  });
  const sepay = await getSePayRuntimeConfig();
  const sepayEnabledByFlags = Boolean(config.settings["payments.provider_sepay_enabled"]);
  const sepayProvider = providers.data.find((p) => p.provider_key === "sepay" && p.enabled);
  const canUseSePay = Boolean(sepayProvider) && sepayEnabledByFlags && sepay.ready;

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/me">
          ← Me
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Nạp Xu</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Chọn một gói nạp do admin cấu hình. Bạn không thể nhập số tiền tùy ý.
        </p>
        <RecommendationTicketBalance balance={ticketBalance} className="mt-2" />
      </div>

      {checkoutError ? (
        <ErrorState message={checkoutError} title="Không tạo được giao dịch nạp" />
      ) : null}

      <Card className="space-y-3">
        <h2 className="text-base font-bold text-white">Nạp Xu nhận Phiếu đề cử</h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          Mỗi 1 Xu nạp thành công được tặng {ticketConfig.ticketsPerPaidCoin} Phiếu đề cử. Ngoài
          nạp Xu, bạn vẫn có thể nhận Phiếu đề cử qua các hoạt động đọc và tương tác trên ChapMee.
        </p>
      </Card>

      {packagesResult.error || providers.error ? (
        <ErrorState
          message={packagesResult.error ?? providers.error ?? "Không tải được gói nạp."}
          title="Không tải được gói nạp"
        />
      ) : null}

      <Card className="space-y-4">
        <SectionHeader
          subtitle="Danh sách gói đọc từ cấu hình admin — không hard-code trên frontend."
          title="Chọn gói nạp Xu"
        />
        {rewardedAdsAvailability.enabled ? (
          <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/5 p-3">
            <p className="mb-2 text-sm font-semibold text-cyan-100">Nhận Xu miễn phí</p>
            <RewardedAdButton availability={rewardedAdsAvailability} placement="coin_checkout" />
          </div>
        ) : null}

        <TopupPackageList
          canSubmit={canUseSePay}
          disabledReason={
            canUseSePay ? null : "SePay tạm thời chưa sẵn sàng. Vui lòng liên hệ admin."
          }
          formAction={submitCheckout}
          packages={packagesResult.data}
          submitLabel="Nạp gói này"
        />

        <p className="text-xs text-zinc-400">
          Xu bonus là Xu khuyến mãi và có thể áp dụng theo chính sách của ChapMee.
        </p>
        <RecommendationTicketsInfo showTopupLink={false} />
      </Card>

      <Card className="space-y-3">
        <SectionHeader
          subtitle="Mock paid chỉ dành cho admin/founder + test mode."
          title="Checkout sessions của bạn"
        />
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
                    <input name="checkout_session_id" type="hidden" value={session.id} />
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
