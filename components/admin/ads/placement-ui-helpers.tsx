import type { AdPlacementListItem, AdPlacementRiskLevel } from "@/types/ads";

export function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

export function RiskBadge({ level }: { level?: AdPlacementRiskLevel }) {
  if (!level || level === "ok") {
    return (
      <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-200">
        Ổn
      </span>
    );
  }
  if (level === "blocked") {
    return (
      <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-xs text-red-200">
        Chặn
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200">
      Cảnh báo
    </span>
  );
}

export function StatusBadges({ item }: { item: AdPlacementListItem }) {
  return (
    <div className="flex flex-wrap gap-1">
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${item.is_enabled ? "bg-emerald-400/15 text-emerald-200" : "bg-zinc-500/20 text-zinc-400"}`}
      >
        {item.is_enabled ? "Bật" : "Tắt"}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${item.is_test_mode ? "bg-amber-400/15 text-amber-200" : "bg-cyan-400/15 text-cyan-200"}`}
      >
        {item.is_test_mode ? "Test" : "Live"}
      </span>
    </div>
  );
}

export function formatSizeLabel(item: AdPlacementListItem) {
  if (item.size_mode === "responsive") return "Responsive";
  if (item.width && item.height) return `${item.width}×${item.height}`;
  return item.size_mode;
}
