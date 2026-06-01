import { getTaxonomyAnalyticsPageData } from "@/lib/admin/get-taxonomy-analytics-page-data";
import {
  parsePagination,
  serializeFilters,
  sliceWithPagination
} from "@/lib/taxonomy-analytics/taxonomyAnalyticsQueries";

function parseRawFilters(url: URL) {
  const raw: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    raw[key] = value;
  }
  return raw;
}

export async function getTaxonomyAnalyticsDataset(url: URL) {
  const raw = parseRawFilters(url);
  const data = await getTaxonomyAnalyticsPageData(raw);
  const pagination = parsePagination(url.searchParams);
  return { data, pagination };
}

export async function getTaxonomyAnalyticsSummary(url: URL) {
  const { data } = await getTaxonomyAnalyticsDataset(url);
  return {
    filters: serializeFilters(data.filters),
    summary: data.summary,
    insights: data.insights.slice(0, 5)
  };
}

export async function getTopReads(url: URL) {
  const { data, pagination } = await getTaxonomyAnalyticsDataset(url);
  return sliceWithPagination(data.topByReads, pagination);
}

export async function getTopCompletion(url: URL) {
  const { data, pagination } = await getTaxonomyAnalyticsDataset(url);
  return sliceWithPagination(data.topByCompletion, pagination);
}

export async function getTopRevenue(url: URL) {
  const { data, pagination } = await getTaxonomyAnalyticsDataset(url);
  return sliceWithPagination(data.topByRevenue, pagination);
}

export async function getSupplyDemand(url: URL) {
  const { data, pagination } = await getTaxonomyAnalyticsDataset(url);
  return {
    highSupplyLowDemand: sliceWithPagination(data.highSupplyLowDemand, pagination),
    lowSupplyHighRetention: sliceWithPagination(data.lowSupplyHighRetention, pagination),
    topReported: sliceWithPagination(data.topReported, pagination)
  };
}

export async function getSeoInsights(url: URL) {
  const { data, pagination } = await getTaxonomyAnalyticsDataset(url);
  return sliceWithPagination(data.seoPages, pagination);
}

export async function getSurfaceContribution(url: URL) {
  const { data, pagination } = await getTaxonomyAnalyticsDataset(url);
  return sliceWithPagination(data.surfaceContribution, pagination);
}

export async function getCreatorContribution(url: URL) {
  const { data, pagination } = await getTaxonomyAnalyticsDataset(url);
  return sliceWithPagination(data.creatorContribution, pagination);
}

export async function getFairnessInsights(url: URL) {
  const { data } = await getTaxonomyAnalyticsDataset(url);
  return {
    fairness: data.fairness,
    recommendedActions: data.recommendedActions
  };
}
