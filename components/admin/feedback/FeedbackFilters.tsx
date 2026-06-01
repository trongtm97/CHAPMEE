"use client";

import { Button } from "@/components/ui";
import {
  ALL_FEEDBACK_TYPES,
  getFeedbackPriorityLabel,
  getFeedbackStatusLabel,
  getFeedbackTypeLabel
} from "@/lib/feedback/constants";
import type { FeedbackDashboardFilters } from "@/types/admin-feedback";
import type { FeedbackPriority, FeedbackStatus } from "@/types/contact-settings";

type Props = {
  filters: FeedbackDashboardFilters;
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  onApply: () => void;
  onReset: () => void;
  onChange: (patch: Partial<FeedbackDashboardFilters>) => void;
  pending?: boolean;
};

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block min-w-0 space-y-1">
      <span className="text-xs text-zinc-500">{label}</span>
      <select
        className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FeedbackFilters({
  filters,
  searchInput,
  onSearchInputChange,
  onApply,
  onReset,
  onChange,
  pending
}: Props) {
  const statusOptions = [
    { value: "all", label: "Tất cả" },
    ...(
      [
        "new",
        "reviewing",
        "need_more_info",
        "replied",
        "resolved",
        "closed",
        "rejected"
      ] as FeedbackStatus[]
    ).map((s) => ({ value: s, label: getFeedbackStatusLabel(s) }))
  ];

  const typeOptions = [
    { value: "all", label: "Tất cả" },
    ...ALL_FEEDBACK_TYPES.filter(
      (t, i, arr) => arr.indexOf(t) === i
    ).map((t) => ({ value: t, label: getFeedbackTypeLabel(t) }))
  ];

  const priorityOptions = [
    { value: "all", label: "Tất cả" },
    ...(["low", "normal", "high", "urgent"] as FeedbackPriority[]).map((p) => ({
      value: p,
      label: getFeedbackPriorityLabel(p)
    }))
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="block min-w-0 space-y-1 md:col-span-2">
            <span className="text-xs text-zinc-500">Tìm kiếm</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500"
              onChange={(e) => onSearchInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onApply()}
              placeholder="Nội dung, username, email, mã feedback..."
              value={searchInput}
            />
          </label>
          <FilterSelect
            label="Trạng thái"
            onChange={(v) => onChange({ status: v as FeedbackDashboardFilters["status"], page: 1 })}
            options={statusOptions}
            value={filters.status}
          />
          <FilterSelect
            label="Loại feedback"
            onChange={(v) => onChange({ category: v, page: 1 })}
            options={typeOptions}
            value={String(filters.category)}
          />
          <FilterSelect
            label="Mức ưu tiên"
            onChange={(v) => onChange({ priority: v as FeedbackDashboardFilters["priority"], page: 1 })}
            options={priorityOptions}
            value={filters.priority}
          />
          <FilterSelect
            label="Ảnh đính kèm"
            onChange={(v) =>
              onChange({ hasScreenshot: v as FeedbackDashboardFilters["hasScreenshot"], page: 1 })
            }
            options={[
              { value: "all", label: "Tất cả" },
              { value: "yes", label: "Có ảnh" },
              { value: "no", label: "Không ảnh" }
            ]}
            value={filters.hasScreenshot}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Từ ngày</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(e) => onChange({ from: e.target.value || undefined, page: 1 })}
              type="date"
              value={filters.from?.slice(0, 10) ?? ""}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Đến ngày</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(e) => onChange({ to: e.target.value || undefined, page: 1 })}
              type="date"
              value={filters.to?.slice(0, 10) ?? ""}
            />
          </label>
          <FilterSelect
            label="Người xử lý"
            onChange={(v) =>
              onChange({ assignee: v as FeedbackDashboardFilters["assignee"], page: 1 })
            }
            options={[
              { value: "all", label: "Tất cả" },
              { value: "me", label: "Tôi" },
              { value: "unassigned", label: "Chưa gán" }
            ]}
            value={filters.assignee}
          />
          <div className="flex shrink-0 flex-nowrap items-end gap-2 md:col-span-3 xl:col-span-3">
            <Button disabled={pending} loading={pending} onClick={onApply} type="button">
              Lọc
            </Button>
            <Button disabled={pending} onClick={onReset} type="button" variant="secondary">
              Xóa lọc
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
