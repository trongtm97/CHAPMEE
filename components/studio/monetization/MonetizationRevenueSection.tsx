import Link from "next/link";
import { Button } from "@/components/ui";
import { formatMonetizationVnd } from "@/lib/studio/format-monetization-display";
import type { StudioMonetizationConfigView, StudioMonetizationOverview, StudioMonetizationWithdrawState } from "@/types/studio-monetization";
import type { CreatorAccessStatus } from "@/types/creator-access";

type MonetizationRevenueSectionProps = {
  overview: StudioMonetizationOverview;
  config: StudioMonetizationConfigView;
  creatorAccess: CreatorAccessStatus;
  withdrawState: StudioMonetizationWithdrawState;
  showMoneyAmounts?: boolean;
};

export function MonetizationRevenueSection({
  overview,
  config,
  creatorAccess,
  withdrawState,
  showMoneyAmounts = true
}: MonetizationRevenueSectionProps) {
  const availableLabel = showMoneyAmounts
    ? formatMonetizationVnd(overview.availableRevenueVnd)
    : "—";
  const pendingLabel = showMoneyAmounts
    ? formatMonetizationVnd(overview.pendingRevenueVnd)
    : "—";
  const minLabel = showMoneyAmounts
    ? formatMonetizationVnd(config.minWithdrawAmountVnd)
    : "—";

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 sm:p-5">
      <h2 className="text-base font-bold text-cyan-50">Doanh thu & rút tiền</h2>
      <p className="mt-1 text-sm text-cyan-100/80">
        Số dư và lịch sử chi tiết nằm tại trang Tài chính. Yêu cầu rút tiền được admin duyệt thủ
        công.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Số dư khả dụng" value={availableLabel} />
        <Metric label="Đang đối soát" value={pendingLabel} />
        <Metric label="Rút tối thiểu" value={minLabel} />
      </dl>

      {withdrawState.blockReason && !withdrawState.canRequestWithdrawal ? (
        <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          {withdrawState.blockReason}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link href="/studio/finance">
          <Button className="w-full sm:w-auto" type="button" variant="primary">
            Mở trang Tài chính
          </Button>
        </Link>
        {config.payoutsEnabled ? (
          withdrawState.canRequestWithdrawal ? (
            <Link href="/studio/finance">
              <Button className="w-full sm:w-auto" type="button" variant="secondary">
                Gửi yêu cầu rút tiền
              </Button>
            </Link>
          ) : (
            <Button
              className="w-full sm:w-auto"
              disabled
              title={withdrawState.blockReason ?? undefined}
              type="button"
              variant="secondary"
            >
              Gửi yêu cầu rút tiền
            </Button>
          )
        ) : null}
      </div>

      {!creatorAccess.withdrawalEnabled && creatorAccess.withdrawalDisabledReason ? (
        <p className="mt-3 text-xs text-rose-200">{creatorAccess.withdrawalDisabledReason}</p>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-white">{value}</dd>
    </div>
  );
}
