"use client";

import { useState } from "react";
import { computeNeedsActionTotal } from "@/lib/admin/creator-row-helpers";
import { summaryCardToFilterPatch } from "@/lib/admin/parse-creator-dashboard-filters";
import type {
  CreatorDashboardFilters,
  CreatorOperationsSummary,
  CreatorSummaryCardKey
} from "@/types/admin-creator";

const PRIMARY: { key: CreatorSummaryCardKey | "needsAction"; label: string }[] = [
  { key: "totalCreators", label: "Tổng tác giả" },
  { key: "monetizationEnabled", label: "Đã bật kiếm tiền" },
  { key: "pendingMonetization", label: "Chờ duyệt kiếm tiền" },
  { key: "pendingPayoutRequests", label: "Có yêu cầu rút tiền" },
  { key: "needsAction", label: "Cần xử lý" }
];

const SECONDARY: { key: CreatorSummaryCardKey; label: string }[] = [
  { key: "activeStudios", label: "Studio đang hoạt động" },
  { key: "pendingVerification", label: "Chờ xác minh" },
  { key: "blueTick", label: "Có tick xanh" },
  { key: "monetizationSuspended", label: "Tạm dừng kiếm tiền" },
  { key: "lowQualityContent", label: "Nội dung chất lượng thấp" },
  { key: "warnedCreators", label: "Tác giả bị cảnh báo" }
];

type Props = {
  summary: CreatorOperationsSummary;
  onNavigate: (patch: Partial<CreatorDashboardFilters>) => void;
};

export function CreatorSummaryCards({ summary, onNavigate }: Props) {
  const [showMore, setShowMore] = useState(false);
  const needsTotal = computeNeedsActionTotal(summary);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {PRIMARY.map((card) => {
          const value =
            card.key === "needsAction" ? needsTotal : summary[card.key as CreatorSummaryCardKey];
          return (
            <button
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-cyan-400/30"
              key={card.key}
              onClick={() => {
                if (card.key === "needsAction") {
                  onNavigate({ sort: "pending_first", page: 1 });
                } else {
                  onNavigate(summaryCardToFilterPatch(card.key as CreatorSummaryCardKey));
                }
              }}
              type="button"
            >
              <p className="text-xl font-bold text-white">
                {new Intl.NumberFormat("vi-VN").format(value)}
              </p>
              <p className="mt-0.5 text-[11px] leading-tight text-zinc-400">{card.label}</p>
            </button>
          );
        })}
      </div>
      <button
        className="text-xs text-cyan-300 hover:text-cyan-200"
        onClick={() => setShowMore((v) => !v)}
        type="button"
      >
        {showMore ? "Ẩn chỉ số phụ" : "Xem thêm chỉ số"}
      </button>
      {showMore ? (
        <div className="flex flex-wrap gap-2">
          {SECONDARY.map((card) => (
            <button
              className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-left text-xs text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
              key={card.key}
              onClick={() => onNavigate(summaryCardToFilterPatch(card.key))}
              type="button"
            >
              <span className="font-semibold text-zinc-200">
                {new Intl.NumberFormat("vi-VN").format(summary[card.key])}
              </span>{" "}
              {card.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
