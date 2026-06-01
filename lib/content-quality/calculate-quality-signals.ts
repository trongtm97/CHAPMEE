import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentQualityConfig,
  ContentQualityReasonCode,
  ContentQualitySignalSnapshot
} from "@/types/content-quality";
import { getQualityConfig, parseQualityConfigDb } from "@/lib/content-quality/get-quality-config";

type StoryRow = {
  id: string;
  title: string;
  hook: string | null;
  short_description: string | null;
  long_description: string | null;
};

type EpisodeRow = {
  id: string;
  title: string;
  content: string;
  word_count: number;
  episode_number: number;
};

const VALID_REPORT_STATUSES = [
  "resolved",
  "resolved_action_taken",
  "reviewed"
] as const;

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function repetitiveContentScore(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim().toLowerCase();
  if (normalized.length < 120) {
    return false;
  }

  const chunk = normalized.slice(0, 80);
  const occurrences = normalized.split(chunk).length - 1;
  return occurrences >= 3;
}

async function fetchReportSignals(
  supabase: SupabaseClient,
  targetType: "story" | "chapter",
  targetId: string,
  minReports: number
) {
  const { data: reports } = await supabase
    .from("reports")
    .select("id, reporter_id, status, reason")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .in("status", [...VALID_REPORT_STATUSES]);

  const rows = reports ?? [];
  const reporterIds = [...new Set(rows.map((r) => r.reporter_id))];

  let trustedReportCount = 0;

  if (reporterIds.length > 0) {
    const { data: qualities } = await supabase
      .from("reporter_quality")
      .select("user_id, trust_score, spam_suspected")
      .in("user_id", reporterIds);

    const trusted = new Set(
      (qualities ?? [])
        .filter((q) => !q.spam_suspected && (q.trust_score ?? 0) >= 40)
        .map((q) => q.user_id)
    );

    trustedReportCount = rows.filter((r) => trusted.has(r.reporter_id)).length;
  }

  const validReportCount = rows.length;
  const thresholdsMet = validReportCount >= minReports;

  return { thresholdsMet, trustedReportCount, validReportCount };
}

async function fetchReadingSignals(supabase: SupabaseClient, storyId: string) {
  const { data: episodes } = await supabase
    .from("episodes")
    .select("id, episode_number")
    .eq("story_id", storyId)
    .in("status", ["published", "approved"])
    .order("episode_number", { ascending: true });

  const episodeRows = episodes ?? [];
  if (episodeRows.length === 0) {
    return {
      continueReadRate: null,
      earlyDropRate: null,
      thresholdsMet: false
    };
  }

  const firstEpisodeId = episodeRows[0].id;

  const { data: progressRows } = await supabase
    .from("reading_progress")
    .select("user_id, episode_id, progress_percent")
    .eq("story_id", storyId);

  const rows = progressRows ?? [];
  if (rows.length < 5) {
    return {
      continueReadRate: null,
      earlyDropRate: null,
      thresholdsMet: false
    };
  }

  const byUser = new Map<string, { maxProgress: number; episodes: Set<string> }>();

  for (const row of rows) {
    const entry = byUser.get(row.user_id) ?? {
      episodes: new Set<string>(),
      maxProgress: 0
    };
    entry.episodes.add(row.episode_id);
    entry.maxProgress = Math.max(entry.maxProgress, row.progress_percent ?? 0);
    byUser.set(row.user_id, entry);
  }

  const starters = rows.filter((r) => r.episode_id === firstEpisodeId);
  const starterUsers = new Set(starters.map((r) => r.user_id));

  let earlyDrops = 0;
  for (const userId of starterUsers) {
    const firstProgress =
      starters.find((r) => r.user_id === userId)?.progress_percent ?? 0;
    if (firstProgress < 20) {
      earlyDrops += 1;
    }
  }

  const earlyDropRate =
    starterUsers.size > 0 ? earlyDrops / starterUsers.size : null;

  let continued = 0;
  for (const userId of starterUsers) {
    const entry = byUser.get(userId);
    if (entry && entry.episodes.size > 1) {
      continued += 1;
    }
  }

  const continueReadRate =
    starterUsers.size > 0 ? continued / starterUsers.size : null;

  return {
    continueReadRate,
    earlyDropRate,
    thresholdsMet: starterUsers.size >= 5
  };
}

function completenessForStory(
  story: StoryRow,
  config: ContentQualityConfig,
  hasMainGenre: boolean
) {
  const issues: string[] = [];
  const description =
    story.short_description?.trim() ||
    story.long_description?.trim() ||
    story.hook?.trim() ||
    "";

  if (!story.title?.trim()) {
    issues.push("Thiếu tiêu đề");
  }

  if (!description) {
    issues.push("Thiếu mô tả");
  } else if (wordCount(description) < config.minContentWordsStory) {
    issues.push("Mô tả quá ngắn");
  }

  if (!hasMainGenre) {
    issues.push("Chưa chọn thể loại");
  }

  return issues;
}

function completenessForChapter(episode: EpisodeRow, config: ContentQualityConfig) {
  const issues: string[] = [];

  if (!episode.title?.trim()) {
    issues.push("Thiếu tiêu đề chương");
  }

  if (!episode.content?.trim()) {
    issues.push("Thiếu nội dung");
  } else if (
    (episode.word_count || wordCount(episode.content)) < config.minContentWordsChapter
  ) {
    issues.push("Nội dung chương quá ngắn");
  }

  if (repetitiveContentScore(episode.content)) {
    issues.push("Nội dung có đoạn lặp lại");
  }

  return issues;
}

export async function calculateQualitySignals(input: {
  supabase: SupabaseClient;
  targetType: "story" | "chapter";
  targetId: string;
  storyId: string;
  config?: ContentQualityConfig;
}): Promise<{
  snapshot: ContentQualitySignalSnapshot;
  suggestedReasons: ContentQualityReasonCode[];
}> {
  const config =
    input.config ??
    (await getQualityConfig().catch(() => parseQualityConfigDb(null)));

  const reportSignals = await fetchReportSignals(
    input.supabase,
    input.targetType,
    input.targetId,
    config.minReportsForReview
  );

  const readingSignals = await fetchReadingSignals(input.supabase, input.storyId);

  let completenessIssues: string[] = [];

  if (input.targetType === "story") {
    const [{ data: story }, { count: mainGenreCount }] = await Promise.all([
      input.supabase
        .from("stories")
        .select("id, title, hook, short_description, long_description")
        .eq("id", input.storyId)
        .maybeSingle(),
      input.supabase
        .from("story_taxonomy_terms")
        .select("id", { count: "exact", head: true })
        .eq("story_id", input.storyId)
        .eq("type", "main_genre")
    ]);

    if (story) {
      completenessIssues = completenessForStory(
        story as StoryRow,
        config,
        (mainGenreCount ?? 0) > 0
      );
    }
  } else {
    const { data: episode } = await input.supabase
      .from("episodes")
      .select("id, title, content, word_count, episode_number")
      .eq("id", input.targetId)
      .maybeSingle();

    if (episode) {
      completenessIssues = completenessForChapter(episode as EpisodeRow, config);
    }
  }

  const thresholdsMet =
    reportSignals.thresholdsMet ||
    readingSignals.thresholdsMet ||
    completenessIssues.length > 0;

  const snapshot: ContentQualitySignalSnapshot = {
    calculatedAt: new Date().toISOString(),
    completenessIssues,
    continueReadRate: readingSignals.continueReadRate,
    earlyDropRate: readingSignals.earlyDropRate,
    lowRatingRatio: null,
    ratingAverage: null,
    ratingCount: 0,
    requireModeratorConfirmation: config.requireModeratorConfirmationForPenalty,
    thresholdsMet,
    trustedReportCount: reportSignals.trustedReportCount,
    validReportCount: reportSignals.validReportCount
  };

  const suggestedReasons: ContentQualityReasonCode[] = [];

  if (completenessIssues.some((i) => i.includes("Mô tả") || i.includes("ngắn"))) {
    suggestedReasons.push("too_short_content");
  }

  if (completenessIssues.some((i) => i.includes("lặp"))) {
    suggestedReasons.push("duplicate_or_repetitive_content");
  }

  if (completenessIssues.some((i) => i.includes("Thiếu"))) {
    suggestedReasons.push("incomplete_story");
  }

  if (
    readingSignals.earlyDropRate !== null &&
    readingSignals.earlyDropRate >= config.earlyDropThreshold
  ) {
    suggestedReasons.push("high_early_drop_rate");
  }

  if (reportSignals.validReportCount >= config.minReportsForReview) {
    suggestedReasons.push("repeated_reports");
  }

  return {
    snapshot,
    suggestedReasons: [...new Set(suggestedReasons)]
  };
}
