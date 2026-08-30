import { redirect } from "next/navigation";
import { Card, ErrorState, SectionHeader } from "@/components/ui";
import { TopupPackageList } from "@/components/coin/TopupPackageList";
import { WalletPageHeader } from "@/components/wallet/WalletPageHeader";
import { WalletBalanceSummary } from "@/components/wallet/WalletBalanceSummary";
import { WalletFaqSection } from "@/components/wallet/WalletFaqSection";
import { WalletPaymentCard } from "@/components/wallet/WalletPaymentCard";
import { UserCoinWalletHistory } from "@/components/wallet/UserCoinWalletPage";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { DEFAULT_MONETIZATION_SETTINGS, getMonetizationConfig } from "@/lib/monetization/config";
import { createCheckoutForCurrentUserAction } from "@/lib/payments/actions";
import { getSePayRuntimeConfig, maskAccountNumber } from "@/lib/payments/sepay-config";
import { getPurchaseUiPolicyForRequest } from "@/lib/payments/purchase-mode";
import { getEnabledPaymentProviderSettings } from "@/lib/data/payment-provider-settings";
import { getActiveTopupPackages } from "@/lib/topup-packages/read";
import { getRecommendationTicketBalance } from "@/lib/recommendations/wallet";
import { getOrCreateUserWallet } from "@/lib/wallets/user-wallet";

export const dynamic = "force-dynamic";

function isWalletEnabled(settings: Record<string, unknown>) {
  return (
    Boolean(settings["monetization.enabled"]) &&
    Boolean(settings["coin.enabled"]) &&
    Boolean(settings["payments.enabled"]) &&
    Boolean(settings["monetization.show_money_ui_to_users"])
  );
}

export default async function WalletPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  async function submitCheckout(formData: FormData) {
    "use server";
    const result = await createCheckoutForCurrentUserAction(formData);
    if (result && typeof result === "object" && "ok" in result && !result.ok) {
      redirect(
        `/coin/checkout?error=${encodeURIComponent(result.error ?? "Không tạo được checkout.")}`
      );
    }
  }

  const query = await searchParams;
  const checkoutError =
    typeof query.error === "string" && query.error.trim() ? query.error.trim() : null;

  const [{ user }, config] = await Promise.all([
    getCurrentUser(),
    getMonetizationConfig({ includePrivate: true }).catch(() => ({
      settings: DEFAULT_MONETIZATION_SETTINGS,
      updatedAt: null
    }))
  ]);

  if (!user) {
    redirect("/login?next=/wallet");
  }

  const authContext = await getCurrentAuthContext().catch(() => null);
  if (authContext?.flags.isBanned || !authContext?.permissions.includes("wallet.view.own")) {
    return (
      <section className="space-y-6">
        <WalletPageHeader />
        <ErrorState
          message={
            authContext?.flags.isBanned
              ? "Tài khoản của bạn đang bị hạn chế. Không thể sử dụng ví Xu."
              : "Bạn không có quyền truy cập ví Xu."
          }
          title="Không thể mở ví"
          variant="danger"
        />
      </section>
    );
  }

  const settings = config.settings as Record<string, unknown>;
  const walletFeatureEnabled = isWalletEnabled(settings);
  const purchasePolicy = await getPurchaseUiPolicyForRequest().catch(() => ({
    runtimePlatform: "web" as const,
    purchaseMode: "consumption_only" as const,
    showSePayTopUp: false,
    showStoreBilling: false,
    showExternalLink: false,
    hideTopUp: true,
    insufficientCoinMessage: "Bạn cần thêm Xu để mở nội dung này."
  }));

  const [walletResult, packagesResult, providers, ticketBalance] = await Promise.all([
    getOrCreateUserWallet(user.id).catch((error) => ({
      data: null,
      error: error instanceof Error ? error.message : "Could not load wallet."
    })),
    getActiveTopupPackages().catch((error) => ({
      data: [],
      error: error instanceof Error ? error.message : "Could not load topup packages."
    })),
    getEnabledPaymentProviderSettings().catch((error) => ({
      data: [],
      error: error instanceof Error ? error.message : "Could not load payment providers."
    })),
    getRecommendationTicketBalance(user.id).catch(() => 0)
  ]);

  const sepay = await getSePayRuntimeConfig();
  const sepayEnabledByFlags = Boolean(settings["payments.provider_sepay_enabled"]);
  const sepayProvider = providers.data.find(
    (provider) => provider.provider_key === "sepay" && provider.enabled
  );
  const canUseSePay =
    !purchasePolicy.hideTopUp && Boolean(sepayProvider) && sepayEnabledByFlags && sepay.ready;

  return (
    <section className="space-y-5">
      <WalletPageHeader />

      <header className="space-y-2.5">
        <p className="page-kicker">Ví Xu</p>
        <h1 className="page-title">Ví Xu</h1>
        <p className="page-copy max-w-2xl">
          Nạp Xu để mở chương, mua truyện và dùng các tính năng nội bộ.
        </p>
      </header>

      {checkoutError ? (
        <ErrorState message={checkoutError} title="Không tạo được giao dịch nạp" />
      ) : null}

      {!walletFeatureEnabled ? (
        <Card className="border-amber-400/20 bg-amber-400/8">
          <SectionHeader
            subtitle="Tính năng đang ở chế độ hạn chế."
            title="Ví Xu tạm thời chưa mở nạp"
          />
          <p className="text-sm leading-6 text-zinc-300">
            Bạn vẫn có thể xem số dư và lịch sử, nhưng chức năng nạp Xu hiện đang bị tắt bởi
            cấu hình hệ thống.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(21rem,0.8fr)]">
        <Card className="space-y-4 border-amber-300/18 bg-[linear-gradient(180deg,rgba(251,191,36,0.05),rgba(255,255,255,0.03))] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionHeader
              subtitle="Chọn gói phù hợp để tiếp tục đọc truyện."
              title="Nạp Xu"
            />
            <span className="inline-flex whitespace-nowrap rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-xs font-semibold text-amber-200">
              1đ = 1 Xu
            </span>
          </div>

          {packagesResult.error ? (
            <ErrorState message={packagesResult.error} title="Không tải được gói nạp" />
          ) : purchasePolicy.showSePayTopUp ? (
            <TopupPackageList
              canSubmit={canUseSePay}
              disabledReason={
                canUseSePay ? null : "Checkout tạm chưa sẵn sàng. Kiểm tra lại cấu hình SePay."
              }
              formAction={submitCheckout}
              packages={packagesResult.data}
              submitLabel="Nạp Xu"
            />
          ) : purchasePolicy.showStoreBilling ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-300">
              Nạp Xu sẽ được xử lý qua in-app billing trên cửa hàng ứng dụng.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
              Ví Xu đang ở chế độ xem. Bạn vẫn dùng được số dư hiện có trong ví.
            </div>
          )}
        </Card>

        <div className="space-y-5">
          {walletResult.data ? (
            <Card className="space-y-4 p-5">
              <SectionHeader subtitle="Tóm tắt số dư hiện tại." title="Số dư ví" />
              <WalletBalanceSummary
                bonusCoinBalance={walletResult.data.bonus_coin_balance}
                paidCoinBalance={walletResult.data.paid_coin_balance}
              />
            </Card>
          ) : (
            <Card className="border-amber-400/20 bg-amber-400/8">
              <SectionHeader subtitle="Dữ liệu ví đang được đồng bộ." title="Số dư ví" />
              <p className="text-sm leading-6 text-zinc-300">
                Chưa tải được số dư ví ngay lúc này. Hệ thống sẽ tự thử lại khi bạn làm mới trang.
              </p>
            </Card>
          )}

          <WalletPaymentCard
            bankAccountName={sepay.config.bankAccountName}
            bankAccountNumberMasked={maskAccountNumber(sepay.config.bankAccountNumber || "-")}
            bankCode={sepay.config.bankCode}
            canUseSePay={canUseSePay}
          />
        </div>
      </div>

      <UserCoinWalletHistory userId={user.id} />

      <WalletFaqSection ticketBalance={ticketBalance} />
    </section>
  );
}
