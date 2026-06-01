import type {
  AlgorithmExplanation,
  AlgorithmItemAuditData
} from "@/types/algorithm-explanation";

type AuditInput = Omit<
  AlgorithmItemAuditData,
  "adminExplanations" | "creatorExplanations" | "error"
>;

function pct(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function fmtScore(value: number) {
  return value.toFixed(3);
}

export function explainWhyItemRanked(
  item: AuditInput,
  surface: "discover" | "reels" | "search" | "ranking"
): AlgorithmExplanation[] {
  const explanations: AlgorithmExplanation[] = [];
  const { scores, exposure, actions, coldStart } = item;

  const finalScore =
    surface === "discover"
      ? scores.finalDiscoverScore
      : surface === "reels"
        ? scores.finalReelsScore
        : surface === "search"
          ? scores.finalSearchBoostScore
          : scores.finalRankingScore;

  explanations.push({
    explanationType: "ranking",
    visibility: "admin",
    title: `Điểm ${surface}`,
    message: `Final score ${surface}: ${fmtScore(finalScore)} (snapshot ${scores.snapshotAt ? new Date(scores.snapshotAt).toLocaleString("vi-VN") : "chưa có"}).`,
    severity: finalScore >= 0.5 ? "success" : finalScore >= 0.25 ? "info" : "warning",
    metadata: { surface, finalScore }
  });

  if (scores.qualityScore >= 0.6) {
    explanations.push({
      explanationType: "quality",
      visibility: "admin",
      title: "Chất lượng nội dung tốt",
      message: `Quality score ${fmtScore(scores.qualityScore)} — completion ${pct(item.safety.completionRate)}, đọc tiếp ${pct(item.safety.nextChapterRate)}.`,
      severity: "success"
    });
  } else if (scores.qualityScore < 0.35) {
    explanations.push({
      explanationType: "quality",
      visibility: "admin",
      title: "Chất lượng đọc thấp",
      message: `Quality score ${fmtScore(scores.qualityScore)} — tỷ lệ hoàn thành/đọc tiếp dưới mức trung bình nền tảng.`,
      severity: "warning"
    });
  }

  if (scores.freshnessScore >= 0.5) {
    explanations.push({
      explanationType: "ranking",
      visibility: "admin",
      title: "Điểm mới / cập nhật",
      message: `Freshness ${fmtScore(scores.freshnessScore)} — nội dung mới hoặc vừa cập nhật chương.`,
      severity: "info"
    });
  }

  const surfaceImpressions = exposure.bySurface[surface] ?? 0;
  if (surfaceImpressions > 0) {
    explanations.push({
      explanationType: "ranking",
      visibility: "admin",
      title: `Impression trên ${surface} (7d)`,
      message: `${surfaceImpressions} impression trên surface ${surface} trong 7 ngày qua.`,
      severity: "info",
      metadata: { surfaceImpressions }
    });
  }

  if (coldStart.status === "active") {
    explanations.push({
      explanationType: "cold_start",
      visibility: "admin",
      title: "Đang trong cold start",
      message: coldStart.qualificationMessage ?? "Item đang được thử nghiệm phân phối.",
      severity: "info"
    });
  }

  if (actions.saves + actions.follows >= 5) {
    explanations.push({
      explanationType: "ranking",
      visibility: "admin",
      title: "Tín hiệu tích cực",
      message: `${actions.saves} lưu, ${actions.follows} follow trong 7d — hỗ trợ xếp hạng.`,
      severity: "success"
    });
  }

  return explanations;
}

export function explainWhyItemSuppressed(item: AuditInput): AlgorithmExplanation[] {
  const explanations: AlgorithmExplanation[] = [];
  const { scores, fairness, safety, actions } = item;

  if (fairness.authorOverCap) {
    explanations.push({
      explanationType: "fairness",
      visibility: "admin",
      title: "Tác giả vượt cap exposure",
      message: `Author share 7d: ${fairness.authorSharePercent.toFixed(1)}% > cap ${fairness.authorCapPercent}%. Fairness score ${fmtScore(scores.fairnessScore)}.`,
      severity: "warning",
      metadata: { authorSharePercent: fairness.authorSharePercent }
    });
  }

  if (fairness.storyOverCap) {
    explanations.push({
      explanationType: "fairness",
      visibility: "admin",
      title: "Truyện vượt cap exposure",
      message: `Story share 7d: ${fairness.storySharePercent.toFixed(1)}% > cap ${fairness.storyCapPercent}%.`,
      severity: "warning"
    });
  }

  if (fairness.penaltyApplied) {
    explanations.push({
      explanationType: "fairness",
      visibility: "admin",
      title: "Đã áp dụng fairness penalty",
      message: `${fairness.recentAdjustments} điều chỉnh gần đây trong fairness_adjustment_logs.`,
      severity: "warning"
    });
  }

  if (safety.policyWarning || safety.reportRate > 0.02) {
    explanations.push({
      explanationType: "safety",
      visibility: "admin",
      title: "Tỷ lệ báo cáo cao",
      message: `Report rate ${pct(safety.reportRate)} (${actions.reports} báo cáo / 7d). Safety score ${fmtScore(scores.safetyScore)}.`,
      severity: safety.reportRate > 0.05 ? "critical" : "warning"
    });
  }

  if (safety.hideRate > 0.03 || actions.hides >= 3) {
    explanations.push({
      explanationType: "safety",
      visibility: "admin",
      title: "Nhiều lượt ẩn",
      message: `Hide rate ${pct(safety.hideRate)} (${actions.hides} ẩn / 7d).`,
      severity: "warning"
    });
  }

  if (scores.spamPenalty > 0) {
    explanations.push({
      explanationType: "spam",
      visibility: "admin",
      title: "Spam / chất lượng metadata",
      message: `Spam penalty áp dụng (mức ${scores.spamPenalty > 0.3 ? "cao" : "vừa"}) — tag trùng, title mismatch hoặc tín hiệu spam khác.`,
      severity: scores.spamPenalty > 0.3 ? "critical" : "warning"
    });
  }

  if (scores.safetyScore < 0.7) {
    explanations.push({
      explanationType: "safety",
      visibility: "admin",
      title: "Safety score thấp",
      message: `Safety score ${fmtScore(scores.safetyScore)} — giảm ưu tiên hiển thị.`,
      severity: "warning"
    });
  }

  if (explanations.length === 0 && scores.finalDiscoverScore < 0.2 && item.exposure.impressions7d < 10) {
    explanations.push({
      explanationType: "ranking",
      visibility: "admin",
      title: "Exposure thấp — chưa đủ tín hiệu",
      message: "Item có ít impression và điểm thấp — có thể chưa qualify cold start hoặc chưa đủ dữ liệu đọc.",
      severity: "info"
    });
  }

  return explanations;
}

export function explainColdStartStatus(item: AuditInput): AlgorithmExplanation[] {
  const { coldStart, safety } = item;
  const explanations: AlgorithmExplanation[] = [];

  if (!coldStart.testId) {
    if (item.itemType === "story" || item.itemType === "reel") {
      explanations.push({
        explanationType: "cold_start",
        visibility: "admin",
        title: "Không có cold start test",
        message: "Item chưa có bản ghi cold_start_tests — có thể đã qualify, fail trước đó, hoặc chưa publish.",
        severity: "info"
      });
    }
    return explanations;
  }

  const progress =
    coldStart.targetImpressions > 0
      ? Math.round((coldStart.deliveredImpressions / coldStart.targetImpressions) * 100)
      : 0;

  if (coldStart.status === "active") {
    explanations.push({
      explanationType: "cold_start",
      visibility: "admin",
      title: "Cold start đang chạy",
      message: `${coldStart.deliveredImpressions}/${coldStart.targetImpressions} impressions (${progress}%). Completion ${pct(safety.completionRate)}, đọc tiếp ${pct(safety.nextChapterRate)}.`,
      severity: "info",
      metadata: { progress }
    });
  }

  if (coldStart.status === "qualified") {
    explanations.push({
      explanationType: "cold_start",
      visibility: "admin",
      title: "Đã qualify cold start",
      message: "Item vượt giai đoạn thử nghiệm — chuyển sang pool growth/trending.",
      severity: "success"
    });
  }

  if (coldStart.status === "failed") {
    explanations.push({
      explanationType: "cold_start",
      visibility: "admin",
      title: "Cold start thất bại",
      message: coldStart.qualificationMessage ?? "Metrics không đạt ngưỡng qualify.",
      severity: "warning"
    });
  }

  return explanations;
}

export function generateAdminAlgorithmExplanation(item: AuditInput): AlgorithmExplanation[] {
  const ranked = [
    ...explainWhyItemRanked(item, "discover"),
    ...explainWhyItemRanked(item, "reels"),
    ...explainWhyItemRanked(item, "ranking")
  ];
  const suppressed = explainWhyItemSuppressed(item);
  const coldStart = explainColdStartStatus(item);

  const scoreSummary: AlgorithmExplanation = {
    explanationType: "ranking",
    visibility: "admin",
    title: "Score breakdown",
    message: `Q=${fmtScore(item.scores.qualityScore)} F=${fmtScore(item.scores.freshnessScore)} D=${fmtScore(item.scores.discoveryScore)} Fair=${fmtScore(item.scores.fairnessScore)} Safe=${fmtScore(item.scores.safetyScore)} | Discover=${fmtScore(item.scores.finalDiscoverScore)} Reels=${fmtScore(item.scores.finalReelsScore)} Ranking=${fmtScore(item.scores.finalRankingScore)}`,
    severity: "info"
  };

  const deduped = new Map<string, AlgorithmExplanation>();
  for (const exp of [scoreSummary, ...ranked, ...suppressed, ...coldStart]) {
    deduped.set(`${exp.explanationType}:${exp.title}`, exp);
  }

  return [...deduped.values()];
}

export function generateCreatorAlgorithmExplanation(item: AuditInput): AlgorithmExplanation[] {
  const messages: AlgorithmExplanation[] = [];
  const { coldStart, safety, scores, actions } = item;

  if (coldStart.status === "active") {
    messages.push({
      explanationType: "cold_start",
      visibility: "creator",
      title: "Truyện đang được thử nghiệm",
      message:
        "ChapMee đang giới thiệu truyện với một nhóm độc giả nhỏ để đo phản hồi. Hãy tập trung vào chương đầu hấp dẫn và cập nhật đều đặn.",
      severity: "info"
    });
  }

  if (coldStart.status === "qualified") {
    messages.push({
      explanationType: "cold_start",
      visibility: "creator",
      title: "Truyện đã vượt giai đoạn thử nghiệm",
      message: "Phản hồi đầu đọc đạt yêu cầu — truyện được đưa vào luồng đề xuất rộng hơn.",
      severity: "success"
    });
  }

  if (coldStart.status === "failed") {
    messages.push({
      explanationType: "cold_start",
      visibility: "creator",
      title: "Giai đoạn thử nghiệm chưa đạt",
      message:
        "Độc giả thử chưa đọc tiếp đủ nhiều. Cải thiện hook chương đầu, tốc độ cập nhật và mô tả truyện rồi tiếp tục xuất bản.",
      severity: "warning"
    });
  }

  if (safety.nextChapterRate >= 0.35 && actions.readComplete >= 5) {
    messages.push({
      explanationType: "quality",
      visibility: "creator",
      title: "Truyện có tỷ lệ đọc tiếp tốt",
      message: "Độc giả thường chuyển sang chương tiếp theo — tín hiệu tích cực cho đề xuất.",
      severity: "success"
    });
  }

  if (safety.completionRate < 0.25 && actions.readStart >= 10) {
    messages.push({
      explanationType: "quality",
      visibility: "creator",
      title: "Truyện cần cải thiện tỷ lệ hoàn thành chương",
      message:
        "Nhiều độc giả bỏ đọc giữa chương. Rút ngắn đoạn mở đầu, tăng cao trào sớm hoặc chia nhỏ chương dài.",
      severity: "warning"
    });
  }

  if (safety.reportRate > 0.02 || safety.hideRate > 0.03 || actions.reports >= 2 || actions.hides >= 3) {
    messages.push({
      explanationType: "safety",
      visibility: "creator",
      title: "Truyện bị giảm hiển thị do nhiều người ẩn/báo cáo",
      message:
        "Một số độc giả ẩn hoặc báo cáo nội dung. Kiểm tra tag, mô tả, ảnh bìa và tuân thủ Community Guidelines.",
      severity: "warning"
    });
  }

  if (scores.spamPenalty > 0.15) {
    messages.push({
      explanationType: "spam",
      visibility: "creator",
      title: "Metadata cần chỉnh",
      message:
        "Tiêu đề, tag hoặc mô tả có thể không khớp nội dung. Tránh tag trùng lặp và cập nhật mô tả/cover chuẩn SEO.",
      severity: "warning"
    });
  }

  if (scores.qualityScore < 0.4 && item.exposure.impressions7d >= 20) {
    messages.push({
      explanationType: "quality",
      visibility: "creator",
      title: "Hiển thị hạn chế do chất lượng đọc",
      message:
        "Tín hiệu đọc (hoàn thành, lưu, follow) còn thấp so với truyện cùng thể loại. Viết chương đầu cuốn hơn và khuyến khích đọc tiếp.",
      severity: "info"
    });
  }

  if (messages.length === 0) {
    messages.push({
      explanationType: "ranking",
      visibility: "creator",
      title: "Truyện đang trong luồng đề xuất bình thường",
      message:
        "ChapMee cân bằng giữa chất lượng đọc, độ mới và công bằng cho tác giả. Tiếp tục cập nhật và tương tác với độc giả.",
      severity: "info"
    });
  }

  return messages;
}
