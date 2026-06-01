import { Card } from "@/components/ui";
import type { AlgorithmControlCenterData } from "@/types/algorithm-settings";

type KpiTone = "ok" | "warning" | "critical" | "neutral";

type KpiItem = {
  label: string;
  value: string;
  subtext: string;
  tone: KpiTone;
};

function toneClasses(tone: KpiTone) {
  if (tone === "ok") return "text-emerald-300";
  if (tone === "warning") return "text-amber-300";
  if (tone === "critical") return "text-red-300";
  return "text-white";
}

function badgeForTone(tone: KpiTone) {
  if (tone === "ok") return { label: "OK", className: "bg-emerald-400/15 text-emerald-200" };
  if (tone === "warning")
    return { label: "Cảnh báo", className: "bg-amber-400/15 text-amber-200" };
  if (tone === "critical")
    return { label: "Nguy hiểm", className: "bg-red-400/15 text-red-200" };
  return { label: "—", className: "bg-white/5 text-zinc-400" };
}

type AlgorithmKpiGridProps = {
  data: AlgorithmControlCenterData;
};

export function AlgorithmKpiGrid({ data }: AlgorithmKpiGridProps) {
  const warningCount = data.configWarnings.length;
  const authorShare = data.exposureConcentration?.topAuthorSharePercent;
  const coldActive = data.overviewKpis.coldStartActive;

  const items: KpiItem[] = [
    {
      label: "Version hiện tại",
      value: data.version,
      subtext: "Nhãn phiên bản cho audit và cache bust.",
      tone: "neutral"
    },
    {
      label: "Settings active",
      value: `${data.activeCount} / ${data.totalCount}`,
      subtext: "Số khóa cấu hình đang bật.",
      tone: data.activeCount > 0 ? "ok" : "warning"
    },
    {
      label: "Cập nhật gần nhất",
      value: data.lastUpdatedAt
        ? new Date(data.lastUpdatedAt).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
          })
        : "Chưa có",
      subtext: "Lần sửa setting gần nhất.",
      tone: "neutral"
    },
    {
      label: "Cảnh báo cấu hình",
      value: String(warningCount),
      subtext: warningCount > 0 ? "Cần xem tab Tổng quan." : "Không có cảnh báo mở.",
      tone: warningCount > 2 ? "critical" : warningCount > 0 ? "warning" : "ok"
    },
    {
      label: "Exposure concentration (7D)",
      value:
        authorShare != null
          ? `${authorShare}%`
          : "—",
      subtext:
        authorShare != null
          ? `Top story: ${data.exposureConcentration?.topStorySharePercent ?? "—"}%`
          : "Chưa có exposure_events.",
      tone:
        authorShare == null
          ? "neutral"
          : authorShare > 35
            ? "critical"
            : authorShare > 25
              ? "warning"
              : "ok"
    },
    {
      label: "Cold start đang boost",
      value: coldActive == null ? "—" : String(coldActive),
      subtext:
        data.coldStartSummary?.schemaMissing
          ? "Chưa migrate cold_start_tests."
          : "Test cold start đang chạy.",
      tone: coldActive != null && coldActive > 0 ? "ok" : "neutral"
    },
    {
      label: "Tác giả vượt ngưỡng exposure",
      value: String(data.overviewKpis.authorsOverCap),
      subtext: "Ước lượng từ top author share > 30%.",
      tone: data.overviewKpis.authorsOverCap > 0 ? "warning" : "ok"
    },
    {
      label: "Penalty / safety active",
      value: String(data.overviewKpis.qualityPenaltyActive),
      subtext: "Khóa penalty và safety đang bật.",
      tone: "neutral"
    },
    {
      label: "Surface đang active",
      value: `${data.overviewKpis.surfacesActive} / 4`,
      subtext: "Reels, Khám phá, Tìm kiếm, BXH.",
      tone: data.overviewKpis.surfacesActive >= 4 ? "ok" : "warning"
    }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const badge = badgeForTone(item.tone);
        return (
          <Card className="space-y-2 p-4" key={item.label}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-zinc-500">{item.label}</p>
              {item.tone !== "neutral" ? (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
              ) : null}
            </div>
            <p className={`text-2xl font-black ${toneClasses(item.tone)}`}>{item.value}</p>
            <p className="text-xs text-zinc-500">{item.subtext}</p>
          </Card>
        );
      })}
    </div>
  );
}
