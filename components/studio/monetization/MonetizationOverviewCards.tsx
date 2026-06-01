import { formatMonetizationVnd } from "@/lib/studio/format-monetization-display";

import { MonetizationKpiCard } from "@/components/studio/monetization/monetization-ui";

import type { StudioMonetizationConfigView, StudioMonetizationOverview } from "@/types/studio-monetization";



type MonetizationOverviewCardsProps = {

  overview: StudioMonetizationOverview;

  config: StudioMonetizationConfigView;

  showMoneyAmounts?: boolean;

};



function emptyMoneyLabel(hasWallet: boolean) {

  return hasWallet ? formatMonetizationVnd(0) : "Chưa có dữ liệu";

}



export function MonetizationOverviewCards({

  overview,

  config,

  showMoneyAmounts = true

}: MonetizationOverviewCardsProps) {

  const moneyHidden = !showMoneyAmounts;



  const cards = [

    {

      tone: "green" as const,

      label: "Có thể rút",

      value: moneyHidden

        ? "—"

        : overview.hasWallet

          ? formatMonetizationVnd(overview.availableRevenueVnd)

          : emptyMoneyLabel(false),

      hint: "Số dư đủ điều kiện để tạo yêu cầu rút tiền.",

      muted: !overview.hasWallet || overview.availableRevenueVnd === 0

    },

    {

      tone: "blue" as const,

      label: "Đang đối soát",

      value: moneyHidden

        ? "—"

        : overview.hasWallet

          ? formatMonetizationVnd(overview.pendingRevenueVnd)

          : emptyMoneyLabel(false),

      hint: "Doanh thu đang chờ xử lý hoặc đối soát.",

      muted: overview.pendingRevenueVnd === 0

    },

    {

      tone: "amber" as const,

      label: "Đang giữ",

      value: moneyHidden

        ? "—"

        : overview.hasWallet

          ? formatMonetizationVnd(overview.lockedRevenueVnd)

          : emptyMoneyLabel(false),

      hint: "Doanh thu chưa mở khóa (không gồm trọn bộ nếu đã tách riêng).",

      muted: overview.lockedRevenueVnd === 0

    },

    {

      tone: "purple" as const,

      label: "Doanh thu trọn bộ đang giữ",

      value: moneyHidden ? "—" : formatMonetizationVnd(overview.lockedFullStoryRevenueVnd),

      hint: "Chờ admin xác nhận hoàn thành truyện.",

      muted: overview.lockedFullStoryRevenueVnd === 0

    },

    {

      tone: "cyan" as const,

      label: "Tổng doanh thu net",

      value: moneyHidden

        ? "—"

        : overview.hasWallet

          ? formatMonetizationVnd(overview.creatorNetRevenueVnd || overview.totalEarnedVnd)

          : emptyMoneyLabel(false),

      hint: "Phần bạn nhận theo tỉ lệ ăn chia.",

      muted: overview.totalEarnedVnd === 0

    },

    {

      tone: "slate" as const,

      label: "Đã rút",

      value: moneyHidden

        ? "—"

        : overview.hasWallet

          ? formatMonetizationVnd(overview.totalWithdrawnVnd)

          : emptyMoneyLabel(false),

      hint: "Tổng số tiền đã rút thành công.",

      muted: overview.totalWithdrawnVnd === 0

    },

    {

      tone: "rose" as const,

      label: "ChapMee giữ",

      value: moneyHidden ? "—" : formatMonetizationVnd(overview.platformFeeVnd),

      hint: "Phần nền tảng giữ theo tỉ lệ ăn chia.",

      muted: overview.platformFeeVnd === 0

    },

    {

      tone: "rose" as const,

      label: "Tip nhận được",

      value:

        moneyHidden || !config.tipsEnabled

          ? "—"

          : formatMonetizationVnd(overview.tipsReceivedVnd),

      hint: "Ủng hộ trực tiếp từ độc giả.",

      muted: overview.tipsReceivedVnd === 0

    },

    {

      tone: "blue" as const,

      label: "Lượt mở khóa trả phí",

      value: moneyHidden ? "—" : overview.paidUnlockCount.toLocaleString("vi-VN"),

      hint: "Gồm mở khóa chương và mua trọn bộ.",

      muted: overview.paidUnlockCount === 0

    }

  ];



  return (

    <div className="space-y-3">

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">

        {cards.map((card) => (

          <MonetizationKpiCard

            hint={card.hint}

            key={card.label}

            label={card.label}

            muted={card.muted && card.value !== "—"}

            tone={card.tone}

            value={card.value}

          />

        ))}

      </div>



      {overview.lockedFullStoryRevenueVnd > 0 ? (

        <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-50">

          Doanh thu bán trọn bộ của truyện chưa được admin xác nhận hoàn thành sẽ tạm giữ. Khi

          admin xác nhận truyện hoàn thành, khoản này sẽ được mở khóa để rút.

        </p>

      ) : null}

    </div>

  );

}


