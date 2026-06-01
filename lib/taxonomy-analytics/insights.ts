import type {
  TaxonomyAnalyticsInsight,
  TaxonomyAnalyticsTermSummary
} from "@/types/taxonomy-analytics";

const HIGH_SUPPLY_STORIES = 20;
const LOW_DEMAND_STARTS = 10;
const LOW_SUPPLY_STORIES = 5;
const HIGH_DEMAND_CLICKS = 50;
const REPORT_THRESHOLD = 3;
const SEO_VIEW_THRESHOLD = 30;
const SEO_CTR_LOW = 2;
const COMPLETION_HIGH = 40;
const REVENUE_LOW = 100;
const CREATOR_LOW = 3;

export function buildTaxonomyInsights(
  terms: TaxonomyAnalyticsTermSummary[]
): TaxonomyAnalyticsInsight[] {
  const insights: TaxonomyAnalyticsInsight[] = [];

  for (const term of terms) {
    if (term.activeStories >= HIGH_SUPPLY_STORIES && term.storyStarts <= LOW_DEMAND_STARTS) {
      insights.push({
        id: `high_supply:${term.termId}`,
        kind: "high_supply_low_demand",
        termId: term.termId,
        termName: term.termName,
        termSlug: term.termSlug,
        type: term.type,
        severity: "warning",
        message: `${term.termName}: ${term.activeStories} truyện nhưng chỉ ${term.storyStarts} lượt bắt đầu đọc — cung cao, cầu thấp.`
      });
    }

    if (
      term.activeStories <= LOW_SUPPLY_STORIES &&
      term.clicks >= HIGH_DEMAND_CLICKS
    ) {
      insights.push({
        id: `low_supply:${term.termId}`,
        kind: "low_supply_high_demand",
        termId: term.termId,
        termName: term.termName,
        termSlug: term.termSlug,
        type: term.type,
        severity: "info",
        message: `${term.termName}: nhiều click (${term.clicks}) nhưng ít truyện (${term.activeStories}) — cơ hội bổ sung nội dung.`
      });
    }

    if (term.reportsWrongTag >= REPORT_THRESHOLD) {
      insights.push({
        id: `quality:${term.termId}`,
        kind: "quality_concern",
        termId: term.termId,
        termName: term.termName,
        termSlug: term.termSlug,
        type: term.type,
        severity: term.reportsWrongTag >= REPORT_THRESHOLD * 2 ? "critical" : "warning",
        message: `${term.termName}: ${term.reportsWrongTag} báo cáo sai tag — cần rà soát phân loại.`
      });
    }

    if (
      term.taxonomyPageViews >= SEO_VIEW_THRESHOLD &&
      term.ctr < SEO_CTR_LOW
    ) {
      insights.push({
        id: `seo:${term.termId}`,
        kind: "seo_opportunity",
        termId: term.termId,
        termName: term.termName,
        termSlug: term.termSlug,
        type: term.type,
        severity: "info",
        message: `${term.termName}: ${term.taxonomyPageViews} lượt xem trang taxonomy nhưng CTR thấp (${term.ctr}%) — tối ưu tiêu đề/thumbnail hoặc nội dung landing.`
      });
    }

    if (
      term.completionRate >= COMPLETION_HIGH &&
      term.revenueCoin <= REVENUE_LOW
    ) {
      insights.push({
        id: `monetization:${term.termId}`,
        kind: "monetization_opportunity",
        termId: term.termId,
        termName: term.termName,
        termSlug: term.termSlug,
        type: term.type,
        severity: "info",
        message: `${term.termName}: completion ${term.completionRate}% cao nhưng doanh thu thấp — xem xét gói truy cập/chương trả phí.`
      });
    }

    if (
      term.storyStarts >= HIGH_DEMAND_CLICKS &&
      term.activeCreators <= CREATOR_LOW
    ) {
      insights.push({
        id: `creator:${term.termId}`,
        kind: "creator_opportunity",
        termId: term.termId,
        termName: term.termName,
        termSlug: term.termSlug,
        type: term.type,
        severity: "info",
        message: `${term.termName}: nhu cầu đọc cao nhưng chỉ ${term.activeCreators} creator active — cơ hội thu hút tác giả.`
      });
    }
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return insights.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );
}
