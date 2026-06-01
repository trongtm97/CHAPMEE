import { ALGORITHM_WEIGHT_GROUPS } from "@/lib/algorithm/weight-groups";
import type {
  AlgorithmControlCenterData,
  AlgorithmControlTabId,
  AlgorithmHealthCheck,
  AlgorithmHealthStatus,
  AlgorithmSettingCategory,
  AlgorithmSettingRow,
  AlgorithmWeightValidation
} from "@/types/algorithm-settings";

const SURFACE_CATEGORIES: AlgorithmSettingCategory[] = [
  "reels",
  "discover",
  "search",
  "ranking"
];

function overallStatus(checks: AlgorithmHealthCheck[]): AlgorithmHealthStatus {
  if (checks.some((c) => c.status === "critical")) return "critical";
  if (checks.some((c) => c.status === "warning")) return "warning";
  return "ok";
}

function categoryHasSettings(
  settings: AlgorithmSettingRow[],
  category: AlgorithmSettingCategory
) {
  return settings.some((s) => s.category === category);
}

export function buildAlgorithmHealthChecks(
  data: Pick<
    AlgorithmControlCenterData,
    | "settings"
    | "weightValidations"
    | "configWarnings"
    | "exposureConcentration"
    | "coldStartSummary"
  >
): { status: AlgorithmHealthStatus; checks: AlgorithmHealthCheck[] } {
  const checks: AlgorithmHealthCheck[] = [];

  for (const validation of data.weightValidations) {
    checks.push({
      id: `weight_${validation.groupId}`,
      label: validation.label,
      status: validation.isValid ? "ok" : "warning",
      message: validation.isValid
        ? `Tổng trọng số = ${validation.sum} (mục tiêu ${validation.targetSum}).`
        : `Tổng = ${validation.sum}, lệch ${validation.delta >= 0 ? "+" : ""}${validation.delta}.`,
      tabId: validation.groupId.includes("reels")
        ? "reels"
        : validation.groupId.includes("discover")
          ? "discover"
          : validation.groupId.includes("search")
            ? "search"
            : validation.groupId.includes("ranking")
              ? "ranking"
              : validation.groupId.includes("fds")
                ? "fairness"
                : undefined
    });
  }

  for (const category of SURFACE_CATEGORIES) {
    if (!categoryHasSettings(data.settings, category)) {
      checks.push({
        id: `missing_${category}`,
        label: `Thiếu cấu hình ${category}`,
        status: "critical",
        message: "Không có setting nào trong nhóm surface này.",
        tabId: category as AlgorithmControlTabId
      });
    }
  }

  const authorShare = data.exposureConcentration?.topAuthorSharePercent;
  if (authorShare == null) {
    checks.push({
      id: "exposure_data",
      label: "Dữ liệu exposure 7 ngày",
      status: "warning",
      message: "Chưa có dữ liệu exposure_events để đánh giá độc quyền.",
      tabId: "exposure_audit"
    });
  } else if (authorShare > 35) {
    checks.push({
      id: "author_concentration",
      label: "Tác giả chiếm exposure cao",
      status: "critical",
      message: `Top author = ${authorShare}% tổng exposure 7 ngày.`,
      tabId: "exposure_audit"
    });
  } else if (authorShare > 25) {
    checks.push({
      id: "author_concentration",
      label: "Tác giả chiếm exposure cao",
      status: "warning",
      message: `Top author = ${authorShare}% — theo dõi thêm.`,
      tabId: "exposure_audit"
    });
  } else {
    checks.push({
      id: "author_concentration",
      label: "Phân bổ exposure tác giả",
      status: "ok",
      message: `Top author = ${authorShare}% trong ngưỡng.`,
      tabId: "exposure_audit"
    });
  }

  const coldImpressions = Number(
    data.settings.find((s) => s.key === "cold_start.new_story_initial_impressions")
      ?.value ?? 0
  );
  checks.push({
    id: "cold_start_story",
    label: "Cold start truyện mới",
    status: coldImpressions > 0 ? "ok" : "warning",
    message:
      coldImpressions > 0
        ? `Impression khởi tạo: ${coldImpressions}.`
        : "Impression khởi tạo truyện mới đang bằng 0.",
    tabId: "cold_start"
  });

  const reportPenalty = Number(
    data.settings.find((s) => s.key === "safety.report_penalty")?.value ?? 0
  );
  checks.push({
    id: "safety_report",
    label: "Penalty báo cáo",
    status: reportPenalty > 0 ? "ok" : "warning",
    message:
      reportPenalty > 0
        ? `Hệ số phạt báo cáo = ${reportPenalty}.`
        : "Penalty báo cáo đang tắt hoặc bằng 0.",
    tabId: "safety_spam"
  });

  if (data.coldStartSummary?.schemaMissing) {
    checks.push({
      id: "cold_start_schema",
      label: "Bảng cold_start_tests",
      status: "warning",
      message: "Chưa migrate cold start — chỉ xem được cấu hình.",
      tabId: "cold_start"
    });
  } else if (data.coldStartSummary) {
    checks.push({
      id: "cold_start_active",
      label: "Nội dung cold start",
      status: data.coldStartSummary.activeCount > 0 ? "ok" : "warning",
      message: `${data.coldStartSummary.activeCount} test đang chạy.`,
      tabId: "cold_start"
    });
  }

  const inactiveSurfaces = SURFACE_CATEGORIES.filter((cat) => {
    const group = ALGORITHM_WEIGHT_GROUPS.find((g) => g.category === cat);
    if (!group) return false;
    const weightKeys = data.settings.filter(
      (s) => s.is_active && s.key.startsWith(group.keyPrefix)
    );
    return weightKeys.length === 0;
  });

  if (inactiveSurfaces.length > 0) {
    checks.push({
      id: "empty_weight_pools",
      label: "Candidate pool trọng số",
      status: "warning",
      message: `Surface thiếu trọng số active: ${inactiveSurfaces.join(", ")}.`,
      tabId: inactiveSurfaces[0] as AlgorithmControlTabId
    });
  }

  if (data.configWarnings.length > 3) {
    checks.push({
      id: "config_warnings",
      label: "Cảnh báo cấu hình",
      status: "warning",
      message: `${data.configWarnings.length} cảnh báo đang mở.`,
      tabId: "overview"
    });
  }

  return {
    status: overallStatus(checks),
    checks
  };
}

export function countActiveSurfaces(settings: AlgorithmSettingRow[]) {
  return SURFACE_CATEGORIES.filter((category) => {
    const group = ALGORITHM_WEIGHT_GROUPS.find((g) => g.category === category);
    if (!group) return false;
    return settings.some(
      (s) => s.is_active && s.key.startsWith(group.keyPrefix) && s.key.includes(".weight.")
    );
  }).length;
}

export function deriveOverviewKpis(
  data: AlgorithmControlCenterData,
  weightValidations: AlgorithmWeightValidation[]
) {
  const invalidWeights = weightValidations.filter((v) => !v.isValid).length;
  const authorOverCap =
    data.exposureConcentration?.topAuthorSharePercent != null &&
    data.exposureConcentration.topAuthorSharePercent > 30;

  return {
    coldStartActive: data.coldStartSummary?.activeCount ?? null,
    authorsOverCap: authorOverCap ? 1 : 0,
    qualityPenaltyActive: data.settings.filter(
      (s) =>
        s.is_active &&
        (s.key.includes("penalty") || s.category === "safety" || s.category === "spam")
    ).length,
    surfacesActive: countActiveSurfaces(data.settings),
    invalidWeightGroups: invalidWeights
  };
}
