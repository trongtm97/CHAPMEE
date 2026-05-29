"use client";

import type { MessagingRiskOverview } from "@/types/admin-messaging";
import type { MessagingDashboardFilters } from "@/types/admin-messaging";

type CardDef = {
  key: keyof MessagingRiskOverview;
  label: string;
  tab?: MessagingDashboardFilters["tab"];
  patch?: Partial<MessagingDashboardFilters>;
};

const CARDS_ROW1: CardDef[] = [
  { key: "openReports", label: "Báo cáo đang mở", tab: "reports", patch: { reportStatus: "open" } },
  { key: "blockedMessages24h", label: "Tin bị chặn 24h", tab: "blocked", patch: { range: "24h" } },
  { key: "restrictedUsers", label: "Người dùng bị hạn chế", tab: "restrictions" },
  { key: "requestsToday", label: "Yêu cầu nhắn tin hôm nay", tab: "overview" }
];

const CARDS_ROW2: CardDef[] = [
  { key: "linkSpamBlocked24h", label: "Link spam bị chặn", tab: "blocked", patch: { range: "24h", safetyReason: "spam_link" } },
  { key: "newAccountAlerts24h", label: "Tài khoản mới bị cảnh báo", tab: "risky", patch: { accountAge: "new", range: "24h" } },
  { key: "heavilyReportedUsers", label: "Người dùng bị report nhiều", tab: "risky" },
  { key: "authorSpamReports24h", label: "Tác giả bị spam nhiều", tab: "reports", patch: { range: "24h" } }
];

type Props = {
  overview: MessagingRiskOverview;
  onNavigate: (patch: Partial<MessagingDashboardFilters>) => void;
};

function CardButton({
  label,
  value,
  onClick
}: {
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-cyan-400/30 hover:bg-white/[0.05]"
      onClick={onClick}
      type="button"
    >
      <p className="text-3xl font-bold text-white">
        {new Intl.NumberFormat("vi-VN").format(value)}
      </p>
      <p className="mt-1 text-sm text-zinc-400">{label}</p>
    </button>
  );
}

export function MessagingSafetySummaryCards({ overview, onNavigate }: Props) {
  function renderRow(cards: CardDef[]) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <CardButton
            key={card.key}
            label={card.label}
            onClick={() =>
              onNavigate({
                tab: card.tab ?? "overview",
                ...card.patch
              })
            }
            value={overview[card.key]}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {renderRow(CARDS_ROW1)}
      {renderRow(CARDS_ROW2)}
    </div>
  );
}
