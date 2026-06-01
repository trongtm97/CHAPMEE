import type { SupabaseClient } from "@supabase/supabase-js";
import { loadColdStartConfig } from "@/lib/cold-start/config";
import { computeTestMetrics, countDeliveredImpressions } from "@/lib/cold-start/metrics";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type { ColdStartTestRow } from "@/types/cold-start";

export async function evaluateColdStartTest(
  supabase: SupabaseClient,
  testId: string,
  options?: { forceQualify?: boolean; forceFail?: boolean; reason?: string }
) {
  const { data: test, error } = await supabase
    .from("cold_start_tests")
    .select("*")
    .eq("id", testId)
    .maybeSingle();

  if (error || !test) {
    return { ok: false as const, error: error?.message ?? "Test không tồn tại." };
  }

  const row = test as ColdStartTestRow;
  if (row.status !== "active" && row.status !== "paused" && !options?.forceQualify) {
    return { ok: false as const, error: "Test không ở trạng thái active." };
  }

  const config = await loadColdStartConfig();
  const metrics = await computeTestMetrics(supabase, row);
  const now = new Date().toISOString();

  if (options?.forceQualify) {
    await supabase
      .from("cold_start_tests")
      .update({
        status: "qualified",
        qualified_at: now,
        qualification_metrics: metrics,
        updated_at: now
      })
      .eq("id", testId);
    return { ok: true as const, status: "qualified" as const, metrics };
  }

  if (options?.forceFail) {
    await supabase
      .from("cold_start_tests")
      .update({
        status: "failed",
        failed_at: now,
        failure_reason: options.reason ?? "Admin dừng test.",
        qualification_metrics: metrics,
        updated_at: now
      })
      .eq("id", testId);
    return { ok: true as const, status: "failed" as const, metrics };
  }

  const spamDetected =
    metrics.report_rate >= config.reportRateThreshold * 1.2 ||
    metrics.hide_rate >= config.hideRateThreshold * 1.2;

  const qualifies =
    metrics.impressions >= config.minImpressionsBeforeEval &&
    metrics.completion_rate >= config.completionRateQualifyThreshold &&
    metrics.next_chapter_rate >= config.nextChapterRateQualifyThreshold &&
    metrics.report_rate < config.reportRateThreshold &&
    metrics.hide_rate < config.hideRateThreshold;

  const fails =
    spamDetected ||
    metrics.completion_rate < 0.08 ||
    (metrics.impressions >= config.minImpressionsBeforeEval &&
      metrics.report_rate >= config.reportRateThreshold) ||
    (metrics.impressions >= config.minImpressionsBeforeEval &&
      metrics.hide_rate >= config.hideRateThreshold);

  if (qualifies) {
    await supabase
      .from("cold_start_tests")
      .update({
        status: "qualified",
        qualified_at: now,
        qualification_metrics: metrics,
        updated_at: now
      })
      .eq("id", testId);
    return { ok: true as const, status: "qualified" as const, metrics };
  }

  if (fails) {
    const reason = spamDetected
      ? "Spam / report hoặc hide rate cao."
      : metrics.completion_rate < 0.08
        ? "Completion rate quá thấp."
        : "Không đạt ngưỡng chất lượng.";

    await supabase
      .from("cold_start_tests")
      .update({
        status: "failed",
        failed_at: now,
        failure_reason: reason,
        qualification_metrics: metrics,
        updated_at: now
      })
      .eq("id", testId);
    return { ok: true as const, status: "failed" as const, metrics };
  }

  await supabase
    .from("cold_start_tests")
    .update({
      qualification_metrics: metrics,
      updated_at: now
    })
    .eq("id", testId);

  return { ok: true as const, status: "active" as const, metrics };
}

export async function updateColdStartProgress(supabase: SupabaseClient) {
  const config = await loadColdStartConfig();
  const now = Date.now();
  const minWindowMs = config.minTestWindowHours * 60 * 60 * 1000;

  const { data: activeTests, error } = await supabase
    .from("cold_start_tests")
    .select("*")
    .eq("status", "active")
    .limit(500);

  if (error) {
    if (isMissingSchemaError(error)) {
      return { updated: 0, evaluated: 0, error: null };
    }
    throw error;
  }

  let updated = 0;
  let evaluated = 0;

  for (const test of (activeTests ?? []) as ColdStartTestRow[]) {
    const delivered = await countDeliveredImpressions(supabase, test);

    await supabase
      .from("cold_start_tests")
      .update({
        delivered_impressions: delivered,
        updated_at: new Date().toISOString()
      })
      .eq("id", test.id);

    updated += 1;

    const startedMs = new Date(test.started_at).getTime();
    const minWindowPassed = now - startedMs >= minWindowMs;
    const targetReached = delivered >= test.target_impressions;
    const windowExpired = test.ends_at
      ? now >= new Date(test.ends_at).getTime()
      : false;

    const shouldEvaluate =
      minWindowPassed &&
      (targetReached ||
        windowExpired ||
        delivered >= config.minImpressionsBeforeEval * 2);

    if (shouldEvaluate) {
      const result = await evaluateColdStartTest(supabase, test.id);

      if (
        result.ok &&
        result.status === "active" &&
        (targetReached || windowExpired)
      ) {
        await supabase
          .from("cold_start_tests")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", test.id)
          .eq("status", "active");
      }

      evaluated += 1;
    }
  }

  return { updated, evaluated, error: null };
}
