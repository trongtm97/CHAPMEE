import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card, ErrorState, SectionHeader } from "@/components/ui";
import { WalletPageHeader } from "@/components/wallet/WalletPageHeader";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getSePayConfig, maskAccountNumber } from "@/lib/payments/sepay-config";
import { createCheckoutForCurrentUserAction } from "@/lib/payments/actions";
import { getActiveCoinPacks } from "@/lib/supabase/coin-packs";
import { listCheckoutSessionsForUser } from "@/lib/supabase/checkout-sessions";
import { getEnabledPaymentProviderSettings } from "@/lib/supabase/payment-provider-settings";
import { UserCoinWalletHistory } from "@/components/wallet/UserCoinWalletPage";
import { getOrCreateUserWallet } from "@/lib/wallets/user-wallet";
import { getPurchaseUiPolicyForRequest } from "@/lib/payments/purchase-mode";

export const dynamic = "force-dynamic";

function isWalletEnabled(settings: Record<string, unknown>) {
  return (
    Boolean(settings["monetization.enabled"]) &&
    Boolean(settings["coin.enabled"]) &&
    Boolean(settings["payments.enabled"]) &&
    Boolean(settings["monetization.show_money_ui_to_users"])
  );
}

export default async function WalletPage() {
  async function submitCheckout(formData: FormData) {
    "use server";
    await createCheckoutForCurrentUserAction(formData);
  }

  const [{ user }, config] = await Promise.all([
    getCurrentUser(),
    getMonetizationConfig({ includePrivate: true })
  ]);

  if (!user) {
    redirect("/login?next=/wallet");
  }

  const authContext = await getCurrentAuthContext();
  if (
    authContext?.flags.isBanned ||
    !authContext?.permissions.includes("wallet.view.own")
  ) {
    return (
      <section className="space-y-6">
        <WalletPageHeader />
        <ErrorState
          message={
            authContext?.flags.isBanned
              ? "Tài khoản của bạn đang bị hạn chế. Không thể sử dụng ví coin."
              : "Bạn không có quyền truy cập ví coin."
          }
          title="Không thể mở ví"
          variant="danger"
        />
      </section>
    );
  }

  const settings = config.settings as Record<string, unknown>;
  const purchasePolicy = await getPurchaseUiPolicyForRequest();
  if (!isWalletEnabled(settings)) {
    return (
      <section className="space-y-4">
        <WalletPageHeader />
        <SectionHeader title="Ví coin" />
        <ErrorState
          message="Tính năng coin đang tắt bởi cấu hình hệ thống."
          title="Ví coin chưa khả dụng"
        />
      </section>
    );
  }

  const [walletResult, packs, providers, checkoutSessions] = await Promise.all([
    getOrCreateUserWallet(user.id),
    getActiveCoinPacks(),
    getEnabledPaymentProviderSettings(),
    listCheckoutSessionsForUser(user.id, 12)
  ]);
  const sepay = getSePayConfig();
  const sepayEnabledByFlags = Boolean(settings["payments.provider_sepay_enabled"]);
  const sepayProvider = providers.data.find(
    (provider) => provider.provider_key === "sepay" && provider.enabled
  );
  const canUseSePay =
    purchasePolicy.showSePayTopUp &&
    Boolean(sepayProvider) &&
    sepayEnabledByFlags &&
    sepay.ready;

  return (
    <section className="space-y-6">
      <WalletPageHeader />
      <div>
        <p className="page-kicker">Ví coin</p>
        <h1 className="page-title">Ví coin & giao dịch</h1>
        <p className="page-copy">
          Quan ly so du, nap coin, phuong thuc thanh toan va lich su giao dich tren desktop.
        </p>
      </div>

      {walletResult.error || packs.error || providers.error ? (
        <ErrorState
          message={walletResult.error ?? packs.error ?? providers.error}
          title="Could not load wallet data"
        />
      ) : null}

      {walletResult.data ? (
        <Card className="space-y-4">
          <SectionHeader subtitle="Tong hop so du hien tai." title="Balance" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Paid coin</p>
              <p className="mt-1 text-2xl font-black text-white">
                {walletResult.data.paid_coin_balance.toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Bonus coin</p>
              <p className="mt-1 text-2xl font-black text-white">
                {walletResult.data.bonus_coin_balance.toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-4">
              <p className="text-xs uppercase tracking-wide text-cyan-100">Total</p>
              <p className="mt-1 text-2xl font-black text-cyan-100">
                {(
                  walletResult.data.paid_coin_balance + walletResult.data.bonus_coin_balance
                ).toLocaleString("vi-VN")}{" "}
                coin
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <SectionHeader subtitle="Chon pack coin va tao checkout." title="Coin packs" />
        {purchasePolicy.showSePayTopUp ? (
          packs.data.length === 0 ? (
            <p className="text-sm text-zinc-400">Chua co coin pack active.</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {packs.data.map((pack) => (
                <form
                  action={submitCheckout}
                  className="space-y-2 rounded-xl border border-white/10 p-4"
                  key={pack.id}
                >
                  <input name="coin_pack_id" type="hidden" value={pack.id} />
                  <input name="provider" type="hidden" value="sepay" />
                  <p className="text-base font-black text-white">{pack.name}</p>
                  <p className="text-sm text-zinc-300">
                    Tong {pack.total_coin_amount.toLocaleString("vi-VN")} coin
                  </p>
                  <p className="text-sm text-zinc-300">
                    {pack.price_vnd.toLocaleString("vi-VN")} VND
                  </p>
                  <Button disabled={!canUseSePay} type="submit">
                    Nap coin
                  </Button>
                </form>
              ))}
            </div>
          )
        ) : purchasePolicy.showStoreBilling ? (
          <p className="text-sm text-zinc-300">
            Nap coin se duoc xu ly qua in-app billing tren cua hang ung dung.
          </p>
        ) : (
          <p className="text-sm text-zinc-400">
            Vi hien tai chi o che do consumption-only. Ban van dung duoc coin da co trong vi.
          </p>
        )}
      </Card>

      {purchasePolicy.showSePayTopUp ? (
        <Card className="space-y-4">
          <SectionHeader subtitle="Thong tin thanh toan SePay tren desktop." title="Payment method" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-1 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-200">
              <p>Provider: SePay / VietQR</p>
              <p>Bank: {sepay.config.bankCode || "-"}</p>
              <p>Account: {maskAccountNumber(sepay.config.bankAccountNumber || "-")}</p>
              <p>Owner: {sepay.config.bankAccountName || "-"}</p>
              {!canUseSePay ? (
                <p className="pt-2 text-amber-300">
                  SePay chua san sang. Kiem tra env + provider settings.
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 p-4">
              <p className="text-sm font-semibold text-cyan-100">SePay QR</p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">
                QR thanh toan hien thi day du trong checkout detail.
              </p>
              <Link
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-300/35 px-4 text-sm font-bold text-cyan-100"
                href="/coin/checkout"
              >
                Mo trang checkout
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      <UserCoinWalletHistory userId={user.id} />

      <Card className="space-y-3">
        <SectionHeader title="Checkout sessions" />
        {checkoutSessions.data.length === 0 ? (
          <p className="text-sm text-zinc-400">Chua co checkout session.</p>
        ) : (
          checkoutSessions.data.map((session) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm"
              key={session.id}
            >
              <p className="font-semibold text-zinc-100">{session.provider}</p>
              <p className="text-zinc-300">{session.status}</p>
              <Link className="text-cyan-200 hover:text-cyan-100" href={`/checkout/${session.id}`}>
                Chi tiet
              </Link>
            </div>
          ))
        )}
      </Card>
    </section>
  );
}
