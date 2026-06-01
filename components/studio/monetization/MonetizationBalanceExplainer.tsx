import Link from "next/link";
import type { CreatorAccessStatus } from "@/types/creator-access";
import type {
  StudioCreatorRevenuePolicyView,
  StudioMonetizationConfigView,
  StudioMonetizationOverview,
  StudioMonetizationWithdrawState
} from "@/types/studio-monetization";

type MonetizationBalanceExplainerProps = {
  overview: StudioMonetizationOverview;
  config: StudioMonetizationConfigView;
  withdrawState: StudioMonetizationWithdrawState;
  policy: StudioCreatorRevenuePolicyView | null;
  creatorAccess: CreatorAccessStatus;
};

type ExplainerItem = {
  label: string;
  active: boolean;
  href?: string;
  cta?: string;
};

export function MonetizationBalanceExplainer({
  overview,
  config,
  withdrawState,
  policy,
  creatorAccess
}: MonetizationBalanceExplainerProps) {
  const items: ExplainerItem[] = [
    {
      label: "Doanh thu đang chờ đối soát",
      active: overview.pendingRevenueVnd > 0
    },
    {
      label: "Doanh thu trọn bộ của truyện chưa hoàn thành đang bị giữ",
      active: overview.lockedFullStoryRevenueVnd > 0
    },
    {
      label: "Truyện đã hoàn thành nhưng chưa được admin xác nhận hoàn thành",
      active: overview.fullStoryEscrowStoriesCount > 0
    },
    {
      label: "Rút tiền đang tắt toàn nền tảng",
      active: !config.payoutsEnabled
    },
    {
      label: "Tài khoản bị admin khóa rút tiền",
      active: !creatorAccess.withdrawalEnabled
    },
    {
      label: "Chưa xác thực tài khoản",
      active: false,
      href: "/studio/settings/verification",
      cta: "Đi tới xác thực"
    },
    {
      label: "Chưa có tài khoản nhận tiền hợp lệ",
      active: false,
      href: "/studio/finance#bank-accounts",
      cta: "Thêm tài khoản"
    },
    {
      label: "Chưa thiết lập PIN rút tiền",
      active: false,
      href: "/studio/finance#withdrawal-pin",
      cta: "Thiết lập PIN"
    },
    {
      label: "Chưa đạt mức rút tối thiểu",
      active: Boolean(withdrawState.amountNeededVnd)
    },
    {
      label: "Doanh thu đang giữ (chưa mở khóa)",
      active: overview.lockedRevenueVnd > overview.lockedFullStoryRevenueVnd
    }
  ];

  const activeItems = items.filter((item) => item.active);

  return (
    <details className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/50">
        Vì sao số dư có thể chưa rút được?
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-sm text-zinc-500">
          Một số khoản doanh thu có thể nằm ở trạng thái đối soát, giữ hoặc chưa đủ điều kiện rút.
        </p>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                item.active
                  ? "border-amber-400/25 bg-amber-400/10 text-amber-50"
                  : "border-white/5 bg-white/[0.02] text-zinc-500"
              }`}
              key={item.label}
            >
              <span>{item.label}</span>
              {item.active && item.href && item.cta ? (
                <Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-200" href={item.href}>
                  {item.cta}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
        {activeItems.length === 0 ? (
          <p className="text-sm text-emerald-200/90">
            Hiện không có lý do giữ tiền đặc biệt nào được phát hiện. Kiểm tra thêm tại{" "}
            <Link className="text-cyan-300 hover:text-cyan-200" href="/studio/finance">
              Tài chính
            </Link>
            .
          </p>
        ) : withdrawState.blockReason ? (
          <p className="text-sm text-amber-100">{withdrawState.blockReason}</p>
        ) : null}
      </div>
    </details>
  );
}
