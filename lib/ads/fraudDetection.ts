import { createAdminClient } from "@/lib/supabase/admin";
import { logAdFraudAudit } from "@/lib/ads/fraud-audit";
import { getThresholdNumber, listAdFraudRules } from "@/lib/ads/fraud-rules";
import { insertAdFraudSignalIfNew } from "@/lib/ads/fraud-signals";
import type { AdFraudRule } from "@/types/ad-fraud";

export type DetectAdFraudOptions = {
  from?: string;
  to?: string;
  month?: string;
  actorId?: string | null;
};

export type DetectAdFraudResult = {
  created: number;
  skipped: number;
  errors: string[];
};

function resolveDateRange(options: DetectAdFraudOptions): { from: string; to: string; month: string | null } {
  if (options.month && /^\d{4}-\d{2}$/.test(options.month)) {
    const [y, m] = options.month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      from: `${options.month}-01`,
      to: `${options.month}-${String(lastDay).padStart(2, "0")}`,
      month: options.month
    };
  }
  const to = options.to ?? new Date().toISOString().slice(0, 10);
  const fromDate = new Date(to);
  fromDate.setDate(fromDate.getDate() - 7);
  const from = options.from ?? fromDate.toISOString().slice(0, 10);
  return { from, to, month: options.month ?? to.slice(0, 7) };
}

async function detectSuddenImpressionSpike(
  rule: AdFraudRule,
  range: { from: string; to: string; month: string | null }
): Promise<number> {
  const supabase = createAdminClient();
  const multiplier = getThresholdNumber(rule.threshold_config, "multiplier", 3);
  const minBaseline = getThresholdNumber(rule.threshold_config, "min_baseline", 50);

  const fromDate = new Date(range.from);
  fromDate.setDate(fromDate.getDate() - 7);
  const baselineFrom = fromDate.toISOString().slice(0, 10);

  const { data: events } = await supabase
    .from("ad_render_events")
    .select("author_id, created_at")
    .eq("event_type", "rendered")
    .not("author_id", "is", null)
    .gte("created_at", `${baselineFrom}T00:00:00Z`)
    .lte("created_at", `${range.to}T23:59:59Z`);

  const byAuthorDate = new Map<string, Map<string, number>>();
  for (const e of events ?? []) {
    const authorId = String(e.author_id);
    const day = String(e.created_at).slice(0, 10);
    if (!byAuthorDate.has(authorId)) byAuthorDate.set(authorId, new Map());
    const dm = byAuthorDate.get(authorId)!;
    dm.set(day, (dm.get(day) ?? 0) + 1);
  }

  let created = 0;
  for (const [authorId, dayMap] of byAuthorDate) {
    const targetDay = range.to;
    const targetCount = dayMap.get(targetDay) ?? 0;
    if (targetCount < minBaseline) continue;

    const priorDays: number[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(targetDay);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (dayMap.has(key)) priorDays.push(dayMap.get(key)!);
    }
    if (priorDays.length === 0) continue;
    const avg = priorDays.reduce((a, b) => a + b, 0) / priorDays.length;
    if (avg <= 0) continue;
    if (targetCount < avg * multiplier) continue;

    const res = await insertAdFraudSignalIfNew({
      rule_key: rule.rule_key,
      severity: rule.severity,
      author_id: authorId,
      event_date: targetDay,
      month: range.month,
      signal_data: {
        target_impressions: targetCount,
        avg_7d: Math.round(avg * 100) / 100,
        multiplier
      }
    });
    if (res.created) created++;
  }
  return created;
}

async function detectHighImpressionLowRead(rule: AdFraudRule, month: string | null): Promise<number> {
  if (!month) return 0;
  const supabase = createAdminClient();
  const minImpressions = getThresholdNumber(rule.threshold_config, "min_impressions", 200);
  const maxReadRatio = getThresholdNumber(rule.threshold_config, "max_read_ratio", 0.08);

  const { data: stats } = await supabase
    .from("ad_monthly_author_stats")
    .select("author_id, rendered_impressions, estimated_reads")
    .eq("month", month);

  let created = 0;
  for (const row of stats ?? []) {
    const impressions = Number(row.rendered_impressions ?? 0);
    const reads = Number(row.estimated_reads ?? 0);
    if (impressions < minImpressions) continue;
    const ratio = impressions > 0 ? reads / impressions : 0;
    if (ratio > maxReadRatio) continue;

    const res = await insertAdFraudSignalIfNew({
      rule_key: rule.rule_key,
      severity: rule.severity,
      author_id: String(row.author_id),
      month,
      signal_data: { impressions, reads, ratio }
    });
    if (res.created) created++;
  }
  return created;
}

async function detectSameSessionManyImpressions(
  rule: AdFraudRule,
  range: { from: string; to: string; month: string | null }
): Promise<number> {
  const supabase = createAdminClient();
  const maxPerSession = getThresholdNumber(
    rule.threshold_config,
    "max_impressions_per_session",
    25
  );

  const { data: events } = await supabase
    .from("ad_render_events")
    .select("session_id, author_id, created_at")
    .eq("event_type", "rendered")
    .not("session_id", "is", null)
    .not("author_id", "is", null)
    .gte("created_at", `${range.from}T00:00:00Z`)
    .lte("created_at", `${range.to}T23:59:59Z`);

  const counts = new Map<string, { authorId: string; day: string; count: number }>();
  for (const e of events ?? []) {
    const key = `${e.session_id}:${e.author_id}:${String(e.created_at).slice(0, 10)}`;
    const prev = counts.get(key);
    if (prev) prev.count++;
    else {
      counts.set(key, {
        authorId: String(e.author_id),
        day: String(e.created_at).slice(0, 10),
        count: 1
      });
    }
  }

  let created = 0;
  for (const [, v] of counts) {
    if (v.count < maxPerSession) continue;
    const res = await insertAdFraudSignalIfNew({
      rule_key: rule.rule_key,
      severity: rule.severity,
      author_id: v.authorId,
      event_date: v.day,
      month: range.month,
      signal_data: { session_impressions: v.count, max_per_session: maxPerSession }
    });
    if (res.created) created++;
  }
  return created;
}

async function detectSuspiciousSelfTraffic(
  rule: AdFraudRule,
  range: { from: string; to: string; month: string | null }
): Promise<number> {
  const supabase = createAdminClient();
  const minSelf = getThresholdNumber(rule.threshold_config, "min_self_impressions", 15);

  const { data: events } = await supabase
    .from("ad_render_events")
    .select("user_id, author_id, created_at")
    .eq("event_type", "rendered")
    .not("user_id", "is", null)
    .not("author_id", "is", null)
    .gte("created_at", `${range.from}T00:00:00Z`)
    .lte("created_at", `${range.to}T23:59:59Z`);

  const selfByAuthorDay = new Map<string, number>();
  for (const e of events ?? []) {
    if (String(e.user_id) !== String(e.author_id)) continue;
    const day = String(e.created_at).slice(0, 10);
    const key = `${e.author_id}:${day}`;
    selfByAuthorDay.set(key, (selfByAuthorDay.get(key) ?? 0) + 1);
  }

  let created = 0;
  for (const [key, count] of selfByAuthorDay) {
    if (count < minSelf) continue;
    const [authorId, day] = key.split(":");
    const res = await insertAdFraudSignalIfNew({
      rule_key: rule.rule_key,
      severity: rule.severity,
      author_id: authorId,
      event_date: day,
      month: range.month,
      signal_data: { self_impressions: count }
    });
    if (res.created) created++;
  }
  return created;
}

async function detectReportModerationHold(rule: AdFraudRule): Promise<number> {
  const supabase = createAdminClient();
  const minReports = getThresholdNumber(rule.threshold_config, "min_pending_reports", 1);

  const { data: reports } = await supabase
    .from("reports")
    .select("target_id, target_type, status")
    .in("status", ["pending", "reviewing"])
    .eq("target_type", "story");

  const storyIds = [...new Set((reports ?? []).map((r) => String(r.target_id)))];
  if (storyIds.length < minReports) return 0;

  const { data: stories } = await supabase
    .from("stories")
    .select("id, title, creator_id, moderation_status")
    .in("id", storyIds.slice(0, 200));

  let created = 0;
  for (const story of stories ?? []) {
    const { data: cp } = await supabase
      .from("creator_profiles")
      .select("user_id")
      .eq("id", story.creator_id)
      .maybeSingle();

    const res = await insertAdFraudSignalIfNew({
      rule_key: rule.rule_key,
      severity: rule.severity,
      author_id: cp?.user_id ? String(cp.user_id) : null,
      story_id: String(story.id),
      signal_data: {
        story_title: story.title,
        moderation_status: story.moderation_status,
        pending_reports: true
      }
    });
    if (res.created) created++;
  }
  return created;
}

async function detectPolicyViolationHold(rule: AdFraudRule): Promise<number> {
  const supabase = createAdminClient();

  const { data: stories } = await supabase
    .from("stories")
    .select("id, title, creator_id, status, moderation_status")
    .or("status.eq.rejected,status.eq.archived,moderation_status.eq.rejected");

  let created = 0;
  for (const story of stories ?? []) {
    const { data: cp } = await supabase
      .from("creator_profiles")
      .select("user_id")
      .eq("id", story.creator_id)
      .maybeSingle();

    const res = await insertAdFraudSignalIfNew({
      rule_key: rule.rule_key,
      severity: rule.severity,
      author_id: cp?.user_id ? String(cp.user_id) : null,
      story_id: String(story.id),
      signal_data: {
        story_status: story.status,
        moderation_status: story.moderation_status
      }
    });
    if (res.created) created++;
  }

  const { data: episodes } = await supabase
    .from("episodes")
    .select("id, story_id, status, moderation_status")
    .or("status.eq.rejected,status.eq.archived,moderation_status.eq.rejected")
    .limit(100);

  for (const ep of episodes ?? []) {
    const { data: story } = await supabase
      .from("stories")
      .select("creator_id")
      .eq("id", ep.story_id)
      .maybeSingle();
    const { data: cp } = story
      ? await supabase
          .from("creator_profiles")
          .select("user_id")
          .eq("id", story.creator_id)
          .maybeSingle()
      : { data: null };

    const res = await insertAdFraudSignalIfNew({
      rule_key: rule.rule_key,
      severity: rule.severity,
      author_id: cp?.user_id ? String(cp.user_id) : null,
      story_id: String(ep.story_id),
      chapter_id: String(ep.id),
      signal_data: {
        episode_status: ep.status,
        moderation_status: ep.moderation_status
      }
    });
    if (res.created) created++;
  }

  return created;
}

export async function detectAdFraudSignals(
  options: DetectAdFraudOptions = {}
): Promise<DetectAdFraudResult> {
  const range = resolveDateRange(options);
  const { rules, error: rulesError } = await listAdFraudRules();
  if (rulesError) {
    return { created: 0, skipped: 0, errors: [rulesError] };
  }

  const enabled = rules.filter((r) => r.is_enabled);
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const rule of enabled) {
    try {
      let n = 0;
      switch (rule.rule_key) {
        case "sudden_impression_spike":
          n = await detectSuddenImpressionSpike(rule, range);
          break;
        case "high_impression_low_read_time":
          n = await detectHighImpressionLowRead(rule, range.month);
          break;
        case "same_session_many_impressions":
          n = await detectSameSessionManyImpressions(rule, range);
          break;
        case "suspicious_creator_self_traffic":
          n = await detectSuspiciousSelfTraffic(rule, range);
          break;
        case "report_or_moderation_hold":
          n = await detectReportModerationHold(rule);
          break;
        case "policy_violation_hold":
          n = await detectPolicyViolationHold(rule);
          break;
        default:
          skipped++;
          continue;
      }
      created += n;
    } catch (e) {
      errors.push(
        `${rule.rule_key}: ${e instanceof Error ? e.message : "detection failed"}`
      );
    }
  }

  if (options.actorId) {
    await logAdFraudAudit({
      actorId: options.actorId,
      action: "detection_run",
      after: { created, skipped, range, errors }
    });
  }

  return { created, skipped, errors };
}
