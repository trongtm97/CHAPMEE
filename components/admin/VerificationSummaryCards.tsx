"use client";

import { summaryCardToFilterPatch } from "@/lib/admin/parse-verification-filters";
import type {
  VerificationDashboardFilters,
  VerificationOperationsSummary,
  VerificationSummaryCardKey
} from "@/types/admin-verification";

const CARDS: { key: VerificationSummaryCardKey; label: string }[] = [
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã xác thực" },
  { key: "blueTick", label: "Có tick xanh" },
  { key: "officialAccount", label: "Tài khoản chính thức" },
  { key: "rejected", label: "Bị từ chối" },
  { key: "revoked", label: "Đã thu hồi" },
  { key: "needsReview", label: "Cần xem lại" },
  { key: "manualGranted7d", label: "Cấp thủ công trong 7 ngày" }
];

type Props = {
  summary: VerificationOperationsSummary;
  activeCard: VerificationSummaryCardKey | null;
  onNavigate: (patch: Partial<VerificationDashboardFilters>) => void;
};

export function VerificationSummaryCards({ summary, activeCard, onNavigate }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {CARDS.map((card) => (
        <button
          className={`rounded-xl border px-3 py-2.5 text-left transition ${
            activeCard === card.key
              ? "border-cyan-400/50 bg-cyan-400/10"
              : "border-white/10 bg-white/[0.03] hover:border-cyan-400/30"
          }`}
          key={card.key}
          onClick={() => onNavigate(summaryCardToFilterPatch(card.key))}
          type="button"
        >
          <p className="text-xl font-bold text-white">
            {new Intl.NumberFormat("vi-VN").format(summary[card.key])}
          </p>
          <p className="mt-0.5 text-[11px] leading-tight text-zinc-400">{card.label}</p>
        </button>
      ))}
    </div>
  );
}
