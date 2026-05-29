"use client";

import { summaryCardToTab } from "@/lib/admin/username-policy-helpers";
import type {
  UsernamePolicyAdminTab,
  UsernamePolicyOperationsSummary,
  UsernamePolicySummaryCardKey
} from "@/types/username-policy";

const CARDS: { key: UsernamePolicySummaryCardKey; label: string }[] = [
  { key: "banned", label: "Username bị cấm" },
  { key: "reserved", label: "Username giữ chỗ" },
  { key: "protected", label: "Từ được bảo vệ" },
  { key: "exceptions", label: "Ngoại lệ đang hoạt động" },
  { key: "conflicts", label: "Xung đột cần xử lý" },
  { key: "changes7d", label: "Đổi username 7 ngày qua" },
  { key: "inactive", label: "Rule đang tắt" }
];

type Props = {
  summary: UsernamePolicyOperationsSummary;
  activeTab: UsernamePolicyAdminTab;
  onSelectTab: (tab: UsernamePolicyAdminTab) => void;
};

export function UsernamePolicySummaryCards({ summary, activeTab, onSelectTab }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {CARDS.map((card) => {
        const tab = summaryCardToTab(card.key);
        const active = activeTab === tab;
        return (
          <button
            className={`rounded-xl border px-3 py-2.5 text-left transition ${
              active
                ? "border-cyan-400/50 bg-cyan-400/10"
                : "border-white/10 bg-white/[0.03] hover:border-cyan-400/30"
            }`}
            key={card.key}
            onClick={() => onSelectTab(tab)}
            type="button"
          >
            <p className="text-xl font-bold text-white">
              {new Intl.NumberFormat("vi-VN").format(summary[card.key])}
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-zinc-400">{card.label}</p>
          </button>
        );
      })}
    </div>
  );
}
