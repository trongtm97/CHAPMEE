import Link from "next/link";
import { Button } from "@/components/ui";
import { MoneyAmount } from "@/components/studio/monetization/dashboard/MoneyAmount";
import { DateLabel } from "@/components/studio/monetization/dashboard/DateLabel";
import { MonetizationEmptyHint } from "@/components/studio/monetization/dashboard/MonetizationEmptyHint";
import { payoutStatusLabel } from "@/lib/studio/monetization-labels";
import { formatMonetizationVnd } from "@/lib/studio/format-monetization-display";
import type { StudioMonetizationPageData } from "@/types/studio-monetization";

type PayoutPanelProps = {
  data: StudioMonetizationPageData;
  showMoneyAmounts: boolean;
};

export function PayoutPanel({ data, showMoneyAmounts }: PayoutPanelProps) {
  const { config, overview, withdrawState, payoutAccounts, payoutRequests, creatorAccess } =
    data;

  if (!config.payoutsEnabled) {
    return (
      <MonetizationEmptyHint
        description="Rút tiền đang tắt trên toàn nền tảng. Bạn vẫn có thể tích lũy doanh thu khi chương trình mở lại."
        title="Rút tiền chưa khả dụng"
      />
    );
  }

  const defaultAccount = payoutAccounts.find((a) => a.is_default) ?? payoutAccounts[0];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 sm:p-5">
        <h2 className="text-base font-bold text-white">Số dư có thể rút</h2>
        <div className="mt-3">
          <MoneyAmount
            emphasis="large"
            emptyLabel="0 ₫"
            hidden={!showMoneyAmounts}
            value={overview.availableRevenueVnd}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Rút tối thiểu: {formatMonetizationVnd(config.minWithdrawAmountVnd)} · Xử lý:{" "}
          {config.payoutProcessingDaysLabel}
        </p>

        {withdrawState.blockReason && !withdrawState.canRequestWithdrawal ? (
          <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            {withdrawState.blockReason}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {withdrawState.canRequestWithdrawal ? (
            <Link href="/studio/finance#withdrawal-request">
              <Button className="w-full sm:w-auto" type="button" variant="primary">
                Yêu cầu rút tiền
              </Button>
            </Link>
          ) : (
            <Button
              className="w-full sm:w-auto"
              disabled
              title={withdrawState.blockReason ?? undefined}
              type="button"
              variant="primary"
            >
              Yêu cầu rút tiền
            </Button>
          )}
          <Link href="/studio/finance">
            <Button className="w-full sm:w-auto" type="button" variant="secondary">
              Mở Tài chính
            </Button>
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
        <h3 className="text-sm font-semibold text-white">Phương thức nhận tiền</h3>
        {defaultAccount ? (
          <p className="mt-2 text-sm text-zinc-300">
            {defaultAccount.bank_name ?? defaultAccount.method} ·{" "}
            {defaultAccount.account_holder_name ?? "—"}
            <span className="ml-2 text-xs text-zinc-500">
              ({defaultAccount.verification_status === "verified" ? "Đã xác minh" : "Chưa xác minh"})
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            Bạn chưa đủ điều kiện rút tiền vì chưa thiết lập phương thức nhận tiền.{" "}
            <Link className="text-cyan-300 hover:underline" href="/studio/finance#bank-accounts">
              Thêm tài khoản
            </Link>
          </p>
        )}

        {!creatorAccess.withdrawalEnabled && creatorAccess.withdrawalDisabledReason ? (
          <p className="mt-3 text-xs text-rose-200">{creatorAccess.withdrawalDisabledReason}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/40">
        <div className="border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Lịch sử rút tiền</h3>
        </div>
        {payoutRequests.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-500">Chưa có yêu cầu rút tiền.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-2 font-semibold">Ngày</th>
                  <th className="px-4 py-2 font-semibold">Số tiền</th>
                  <th className="px-4 py-2 font-semibold">Trạng thái</th>
                  <th className="px-4 py-2 font-semibold">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {payoutRequests.map((req) => (
                  <tr className="border-b border-white/5" key={req.id}>
                    <td className="px-4 py-3 text-zinc-300">
                      <DateLabel iso={req.requested_at} variant="datetime" />
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {formatMonetizationVnd(Number(req.amount_vnd ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {payoutStatusLabel(String(req.status))}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-xs text-zinc-500">
                      {req.admin_note ?? req.reject_reason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
