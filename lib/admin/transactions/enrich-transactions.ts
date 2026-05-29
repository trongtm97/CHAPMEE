"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getTransactionRiskReasons,
  transactionNeedsReview
} from "@/lib/admin/transactions/transaction-risk";
import type { AdminTransactionListRow } from "@/types/admin-transaction";
import type { TransactionRow } from "@/types/transaction";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
};

type EpisodeRow = {
  id: string;
  title: string | null;
  episode_number: number | null;
};

function profileLabel(profile: ProfileRow | undefined) {
  if (!profile) return null;
  return profile.display_name ?? profile.username ?? profile.email ?? profile.id.slice(0, 8);
}

export async function enrichAdminTransactions(
  rows: TransactionRow[],
  options?: {
    riskEventIds?: Set<string>;
    chargebackIds?: Set<string>;
  }
): Promise<AdminTransactionListRow[]> {
  if (rows.length === 0) return [];

  const supabase = await createClient();
  const userIds = [
    ...new Set(
      rows.flatMap((row) => [row.user_id, row.creator_user_id]).filter(Boolean) as string[]
    )
  ];
  const storyIds = [...new Set(rows.map((row) => row.story_id).filter(Boolean) as string[])];
  const chapterIds = [...new Set(rows.map((row) => row.chapter_id).filter(Boolean) as string[])];

  const [profilesRes, storiesRes, episodesRes] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, username, display_name, email").in("id", userIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    storyIds.length
      ? supabase.from("stories").select("id, title, slug").in("id", storyIds)
      : Promise.resolve({ data: [] as StoryRow[] }),
    chapterIds.length
      ? supabase
          .from("episodes")
          .select("id, title, episode_number")
          .in("id", chapterIds)
      : Promise.resolve({ data: [] as EpisodeRow[] })
  ]);

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [String(p.id), p as ProfileRow]));
  const storyMap = new Map((storiesRes.data ?? []).map((s) => [String(s.id), s as StoryRow]));
  const episodeMap = new Map(
    (episodesRes.data ?? []).map((e) => [String(e.id), e as EpisodeRow])
  );

  return rows.map((row) => {
    const userProfile = row.user_id ? profileMap.get(row.user_id) : undefined;
    const creatorProfile = row.creator_user_id
      ? profileMap.get(row.creator_user_id)
      : undefined;
    const story = row.story_id ? storyMap.get(row.story_id) : undefined;
    const episode = row.chapter_id ? episodeMap.get(row.chapter_id) : undefined;

    const chapterText = episode
      ? episode.title ?? (episode.episode_number != null ? `Chương ${episode.episode_number}` : null)
      : null;
    const relatedContent = [story?.title, chapterText].filter(Boolean).join(" · ") || null;

    const riskReasons = getTransactionRiskReasons(row, {
      hasRiskEvent: options?.riskEventIds?.has(row.id),
      hasChargeback: options?.chargebackIds?.has(row.id)
    });

    return {
      ...row,
      userLabel: profileLabel(userProfile),
      userEmail: userProfile?.email ?? null,
      creatorLabel: profileLabel(creatorProfile),
      relatedContent,
      storySlug: story?.slug ?? null,
      episodeNumber: episode?.episode_number ?? null,
      riskReasons,
      needsReview: transactionNeedsReview(riskReasons)
    };
  });
}

export async function fetchTransactionRiskContext(transactionIds: string[]) {
  if (transactionIds.length === 0) {
    return { riskEventIds: new Set<string>(), chargebackIds: new Set<string>() };
  }

  const supabase = await createClient();
  const [riskRes, chargebackRes] = await Promise.all([
    supabase
      .from("risk_events")
      .select("transaction_id")
      .in("transaction_id", transactionIds)
      .in("status", ["open", "reviewing"]),
    supabase
      .from("chargebacks")
      .select("original_transaction_id")
      .in("original_transaction_id", transactionIds)
  ]);

  return {
    riskEventIds: new Set(
      (riskRes.data ?? [])
        .map((row) => row.transaction_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
    chargebackIds: new Set(
      (chargebackRes.data ?? [])
        .map((row) => row.original_transaction_id as string | null)
        .filter((id): id is string => Boolean(id))
    )
  };
}
