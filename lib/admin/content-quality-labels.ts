"use client";

import { qualityReasonLabel } from "@/lib/content-quality/labels";
import type { ContentQualityReasonCode } from "@/types/content-quality";

export const QUALITY_RISK_LABELS = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  critical: "Rất cao"
} as const;

export const QUALITY_REASON_FILTER_OPTIONS: Array<{
  code: ContentQualityReasonCode | "all";
  label: string;
}> = [
  { code: "all", label: "Tất cả lý do" },
  { code: "low_user_rating", label: "Đánh giá người đọc thấp" },
  { code: "high_early_drop_rate", label: "Tỷ lệ bỏ đọc cao" },
  { code: "repeated_reports", label: "Nhiều báo cáo chất lượng" },
  { code: "too_short_content", label: "Nội dung quá ngắn" },
  { code: "poor_formatting", label: "Định dạng khó đọc" },
  { code: "duplicate_or_repetitive_content", label: "Trùng lặp hoặc spam" },
  { code: "misleading_title", label: "Tiêu đề gây hiểu nhầm" },
  { code: "incomplete_story", label: "Nội dung chưa hoàn chỉnh" },
  { code: "moderator_confirmed_low_quality", label: "Nội dung sơ sài / khác" }
];

export function qualityRiskLabel(level: keyof typeof QUALITY_RISK_LABELS) {
  return QUALITY_RISK_LABELS[level] ?? level;
}

export { qualityReasonLabel };
