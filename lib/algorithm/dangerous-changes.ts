import type { AlgorithmDangerousChange } from "@/types/algorithm-settings";

const COLD_START_KEYS = [
  "cold_start.new_story_initial_impressions",
  "cold_start.new_reel_initial_impressions",
  "cold_start.new_author_daily_min_impressions"
] as const;

const FAIRNESS_BOOST_KEYS = [
  "fairness.long_tail_quality_boost",
  "fairness.under_exposed_boost",
  "fairness.min_long_tail_slots_percent"
] as const;

const SAFETY_PENALTY_KEYS = [
  "safety.report_penalty",
  "safety.hide_penalty",
  "safety.policy_warning_penalty"
] as const;

export function detectDangerousAlgorithmChange(
  key: string,
  nextValue: unknown
): AlgorithmDangerousChange | null {
  const numeric =
    typeof nextValue === "number"
      ? nextValue
      : typeof nextValue === "string"
        ? Number(nextValue)
        : NaN;

  if (COLD_START_KEYS.includes(key as (typeof COLD_START_KEYS)[number])) {
    if (!Number.isNaN(numeric) && numeric <= 0) {
      return {
        code: "cold_start_zero",
        message:
          "Giảm cold start về 0 có thể chặn hoàn toàn cơ hội hiển thị cho nội dung/tác giả mới.",
        requiresConfirm: true
      };
    }
  }

  if (key === "fairness.author_exposure_cap_7d_percent" && numeric > 40) {
    return {
      code: "exposure_cap_high",
      message: "Tăng exposure cap tác giả quá cao (>40%) có thể làm mất cân bằng hiển thị.",
      requiresConfirm: true
    };
  }

  if (key === "fairness.story_exposure_cap_7d_percent" && numeric > 35) {
    return {
      code: "story_cap_high",
      message: "Tăng exposure cap truyện quá cao (>35%) có thể tập trung hiển thị vào ít truyện.",
      requiresConfirm: true
    };
  }

  if (FAIRNESS_BOOST_KEYS.includes(key as (typeof FAIRNESS_BOOST_KEYS)[number])) {
    if (!Number.isNaN(numeric) && numeric <= 0) {
      return {
        code: "fairness_disabled",
        message: "Tắt boost công bằng (giá trị 0) có thể giảm đa dạng hiển thị đáng kể.",
        requiresConfirm: true
      };
    }
  }

  if (SAFETY_PENALTY_KEYS.includes(key as (typeof SAFETY_PENALTY_KEYS)[number])) {
    if (!Number.isNaN(numeric) && numeric <= 0) {
      return {
        code: "safety_penalty_off",
        message: "Tắt penalty an toàn có thể cho phép nội dung rủi ro leo top.",
        requiresConfirm: true
      };
    }
  }

  if (key === "ranking.report_penalty_weight" && numeric <= 0) {
    return {
      code: "ranking_report_penalty_off",
      message: "Tắt phạt báo cáo trên ranking có thể bỏ qua tín hiệu moderation.",
      requiresConfirm: true
    };
  }

  return null;
}
