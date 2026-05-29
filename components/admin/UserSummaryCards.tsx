"use client";

import type { UserDashboardFilters, UserOperationsSummary } from "@/types/admin-user";

type CardDef = {
  key: keyof UserOperationsSummary;
  label: string;
  patch: Partial<UserDashboardFilters>;
};

const CARDS: CardDef[] = [
  { key: "totalUsers", label: "Tổng người dùng", patch: { status: "all", role: "all" } },
  { key: "newUsers24h", label: "Người dùng mới 24h", patch: { timeRange: "today" } },
  { key: "active7d", label: "Hoạt động 7 ngày", patch: { timeRange: "7d" } },
  { key: "creators", label: "Tác giả", patch: { role: "creator" } },
  { key: "restrictedUsers", label: "Tài khoản bị hạn chế", patch: { status: "restricted" } },
  { key: "bannedUsers", label: "Tài khoản bị khóa", patch: { status: "banned" } },
  {
    key: "pendingVerification",
    label: "Chờ xác minh",
    patch: { status: "pending_verification" }
  },
  { key: "usersWithStrikes", label: "Có cảnh báo/strike", patch: { status: "has_strike" } }
];

type Props = {
  summary: UserOperationsSummary;
  onNavigate: (patch: Partial<UserDashboardFilters>) => void;
};

export function UserSummaryCards({ summary, onNavigate }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((card) => (
        <button
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-cyan-400/30"
          key={card.key}
          onClick={() => onNavigate(card.patch)}
          type="button"
        >
          <p className="text-3xl font-bold text-white">
            {new Intl.NumberFormat("vi-VN").format(summary[card.key])}
          </p>
          <p className="mt-1 text-sm text-zinc-400">{card.label}</p>
        </button>
      ))}
    </div>
  );
}
