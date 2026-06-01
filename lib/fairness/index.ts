export { calculateExposureShare, topEntitiesFromMap, windowStartIso } from "@/lib/fairness/exposure-share";
export { loadExposure7dContext, emptyExposure7dContext } from "@/lib/fairness/load-exposure-7d";
export { applyExposureCaps } from "@/lib/fairness/apply-exposure-caps";
export { enforceFeedDiversity, summarizeFeedDiversity } from "@/lib/fairness/diversity";
export { ensureMinimumDiscoveryQuota } from "@/lib/fairness/discovery-quota";
export {
  persistExposureDistributionSnapshot,
  generateAllExposureSnapshots
} from "@/lib/fairness/snapshots";
export { logFairnessAdjustments } from "@/lib/fairness/adjustment-log";
export { loadFairnessAlertThresholds, resolveWarningLevel } from "@/lib/fairness/thresholds";
export { applyFairnessGuardPipeline } from "@/lib/fairness/pipeline";
export { calculateGini, topPercentShare } from "@/lib/fairness/gini";
