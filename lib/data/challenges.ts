import { createClient } from "@/lib/data/server";
import { createBulkNotifications } from "@/lib/notifications/create-notification";
import type {
  ChallengeEntryView,
  ChallengeFormValues,
  ChallengeRecord,
  ChallengeView
} from "@/types/challenge";

export type ChallengeListItem = ChallengeView;

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function toChallengeRecord(row: ChallengeRow): ChallengeRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    promptText: row.prompt_text,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sponsoredCampaignId: row.sponsored_campaign_id,
    createdAt: row.created_at
  };
}

type ChallengeRow = {
  id: string;
  title: string;
  description: string | null;
  prompt_text: string;
  status: ChallengeRecord["status"];
  starts_at: string | null;
  ends_at: string | null;
  sponsored_campaign_id: string | null;
  created_at: string;
};
type EntryRow = {
  id: string;
  challenge_id: string;
  user_id: string;
  story_id: string | null;
  chapter_id: string | null;
  title: string;
  description: string | null;
  created_at: string;
  vote_count: number | null;
  user_voted: boolean | null;
  profiles:
    | { display_name: string | null; username: string | null }
    | { display_name: string | null; username: string | null }[]
    | null;
  stories:
    | { title: string | null; slug: string | null; public_code: string | null }
    | { title: string | null; slug: string | null; public_code: string | null }[]
    | null;
};

async function maybeAnnounceClosedChallengeResults(input: {
  challengeId: string;
  challengeTitle: string;
  entries: ChallengeEntryView[];
}) {
  if (input.entries.length === 0) {
    return;
  }

  const rankedEntries = [...input.entries].sort(
    (a, b) => b.voteCount - a.voteCount || +new Date(a.createdAt) - +new Date(b.createdAt)
  );
  const winner = rankedEntries[0];
  const participantIds = Array.from(
    new Set(rankedEntries.map((entry) => entry.userId).filter(Boolean))
  );

  await createBulkNotifications(participantIds, "challenge_result_announced", {
    actionUrl: `/challenges/${input.challengeId}`,
    body: winner
      ? `Kết quả challenge "${input.challengeTitle}" đã có. Entry dẫn đầu hiện tại: "${winner.title}".`
      : `Kết quả challenge "${input.challengeTitle}" đã được cập nhật.`,
    dedupeWindowMinutes: 60 * 24 * 30,
    metadata: {
      challenge_id: input.challengeId,
      challenge_title: input.challengeTitle,
      winner_entry_id: winner?.id ?? null,
      winner_user_id: winner?.userId ?? null
    },
    targetId: input.challengeId,
    targetType: "challenge",
    title: `Challenge "${input.challengeTitle}" đã công bố kết quả`
  });
}

export async function getChallenges(): Promise<ChallengeListItem[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_challenges")
    .select("id, title, description, prompt_text, status, starts_at, ends_at, sponsored_campaign_id, created_at")
    .in("status", ["active", "closed"])
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const challengeRows = data as unknown as ChallengeRow[];

  const entryCounts = new Map<string, number>();
  if (challengeRows.length > 0) {
    const { data: entryRows } = await db
      .from("challenge_entries")
      .select("challenge_id")
      .in("challenge_id", challengeRows.map((item) => item.id));

    for (const row of (entryRows ?? []) as Array<{ challenge_id: string }>) {
      entryCounts.set(row.challenge_id, (entryCounts.get(row.challenge_id) ?? 0) + 1);
    }
  }

  return challengeRows.map((challenge) => {
    const challengeRecord = toChallengeRecord(challenge);
    return {
      ...challengeRecord,
      entryCount: entryCounts.get(challenge.id) ?? 0,
      userCanJoin: challengeRecord.status === "active"
    };
  });
}

export async function getChallengeById(id: string): Promise<{ challenge: ChallengeListItem | null; entries: ChallengeEntryView[]; isOwner: boolean }> {
  const db = await createClient();
  const { data: userData } = await db.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { data, error } = await db
    .from("creator_challenges")
    .select("id, title, description, prompt_text, status, starts_at, ends_at, sponsored_campaign_id, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return { challenge: null, entries: [], isOwner: false };

  const challenge = data as unknown as ChallengeRow;
  const challengeRecord = toChallengeRecord(challenge);
  const { data: entryData } = await db
    .from("challenge_entries")
    .select("id, challenge_id, user_id, story_id, chapter_id, title, description, created_at, profiles(display_name, username), stories(title, slug, public_code)")
    .eq("challenge_id", challengeRecord.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const entries = ((entryData ?? []) as unknown as EntryRow[]).map((entry) => {
    const author = firstRelation(entry.profiles);
    const story = firstRelation(entry.stories);

    return {
      id: entry.id,
      challengeId: entry.challenge_id,
      userId: entry.user_id,
      storyId: entry.story_id,
      chapterId: entry.chapter_id,
      title: entry.title,
      description: entry.description,
      createdAt: entry.created_at,
      voteCount: Number(entry.vote_count ?? 0),
      userVoted: Boolean(entry.user_voted),
      authorName: author?.display_name ?? author?.username ?? null,
      storyTitle: story?.title ?? null,
      storySlug: story?.slug ?? null,
      storyPublicCode: story?.public_code ?? null
    };
  });

  const sortedEntries = [...entries].sort((a, b) => b.voteCount - a.voteCount || +new Date(b.createdAt) - +new Date(a.createdAt));

  if (challengeRecord.status === "closed") {
    try {
      await maybeAnnounceClosedChallengeResults({
        challengeId: challengeRecord.id,
        challengeTitle: challengeRecord.title,
        entries: sortedEntries
      });
    } catch (error) {
      console.warn(
        "[notifications] challenge results notify failed",
        error instanceof Error ? error.message : "Unknown notification error"
      );
    }
  }

  return {
    challenge: {
      ...challengeRecord,
      entryCount: entries.length,
      userCanJoin: challengeRecord.status === "active"
    },
    entries: sortedEntries,
    isOwner: Boolean(userId && false)
  };
}

export async function createChallenge(values: ChallengeFormValues) {
  const db = await createClient();
  const { data: userData } = await db.auth.getUser();
  if (!userData.user) throw new Error("Vui lòng đăng nhập.");

  const { data, error } = await db
    .from("creator_challenges")
    .insert({
      title: values.title,
      description: values.description,
      prompt_text: values.promptText,
      status: values.status,
      starts_at: values.startsAt,
      ends_at: values.endsAt
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Không tạo được challenge.");
  return data.id as string;
}

export async function createChallengeEntry(input: { challengeId: string; title: string; description?: string | null; storyId?: string | null; chapterId?: string | null; }) {
  const db = await createClient();
  const { data: userData } = await db.auth.getUser();
  if (!userData.user) throw new Error("Vui lòng đăng nhập để tham gia challenge.");

  const { error } = await db.from("challenge_entries").insert({
    challenge_id: input.challengeId,
    chapter_id: input.chapterId ?? null,
    description: input.description ?? null,
    story_id: input.storyId ?? null,
    title: input.title,
    user_id: userData.user.id
  });

  if (error) throw new Error(error.message);
}

export async function voteChallengeEntry(input: { challengeId: string; entryId: string; }) {
  const db = await createClient();
  const { data: userData } = await db.auth.getUser();
  if (!userData.user) return { loginRequired: true };

  const { data: existing } = await db
    .from("challenge_votes")
    .select("id")
    .eq("challenge_id", input.challengeId)
    .eq("entry_id", input.entryId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (existing) return { loginRequired: false, ok: true };

  const { error } = await db.from("challenge_votes").insert({
    challenge_id: input.challengeId,
    entry_id: input.entryId,
    user_id: userData.user.id
  });

  if (error) throw new Error(error.message);
  return { loginRequired: false, ok: true };
}
