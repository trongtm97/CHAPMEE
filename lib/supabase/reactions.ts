"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeRecordFanScoreAction } from "@/lib/supabase/fan-scores";
import { CHAPTER_REACTION_OPTIONS } from "@/types/reaction";
import type {
  ChapterReactionKey,
  ChapterReactionView,
  ChapterReactionOptionView
} from "@/types/reaction";

const reactionMap = new Map(CHAPTER_REACTION_OPTIONS.map((option) => [option.key, option]));

type ReactionRow = {
  chapter_id: string;
  story_id: string;
  reaction_key: ChapterReactionKey;
  user_id: string;
};



function buildView(rows: ReactionRow[], userReactionKey: ChapterReactionKey | null, chapterId: string, storyId: string): ChapterReactionView {
  const totalReactions = rows.length;
  const counts = new Map<ChapterReactionKey, number>();
  rows.forEach((row) => counts.set(row.reaction_key, (counts.get(row.reaction_key) ?? 0) + 1));

  const options: ChapterReactionOptionView[] = CHAPTER_REACTION_OPTIONS.map((option) => {
    const count = counts.get(option.key) ?? 0;
    const percent = totalReactions > 0 ? Math.round((count / totalReactions) * 100) : 0;
    return {
      ...option,
      count,
      percent,
      isSelected: userReactionKey === option.key
    };
  });

  const dominantReactionKey = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    chapterId,
    storyId,
    totalReactions,
    userReactionKey,
    hasReacted: Boolean(userReactionKey),
    dominantReactionKey,
    options,
    canReact: true
  };
}

export async function getChapterReactionView(chapterId: string, userId?: string | null): Promise<ChapterReactionView | null> {
  const supabase = await createClient();
  const { data: chapter } = await supabase
    .from("episodes")
    .select("id, story_id")
    .eq("id", chapterId)
    .maybeSingle();

  if (!chapter) return null;

  const { data: rows } = await supabase
    .from("chapter_reactions")
    .select("chapter_id, story_id, reaction_key, user_id")
    .eq("chapter_id", chapterId);

  const { data: myRow } = userId
    ? await supabase
        .from("chapter_reactions")
        .select("reaction_key")
        .eq("chapter_id", chapterId)
        .eq("user_id", userId)
        .maybeSingle()
    : { data: null };

  return buildView(
    (rows ?? []) as ReactionRow[],
    (myRow as { reaction_key?: ChapterReactionKey } | null)?.reaction_key ?? null,
    chapter.id,
    chapter.story_id
  );
}

export async function reactToChapter(input: {
  chapterId: string;
  storyId: string;
  reactionKey: ChapterReactionKey;
  returnTo: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(input.returnTo)}`);
  }

  if (!reactionMap.has(input.reactionKey)) {
    throw new Error("Cảm xúc không hợp lệ.");
  }

  const { error } = await supabase.from("chapter_reactions").upsert(
    {
      chapter_id: input.chapterId,
      story_id: input.storyId,
      user_id: user.id,
      reaction_key: input.reactionKey
    },
    { onConflict: "chapter_id,user_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  await safeRecordFanScoreAction({
    authorId: null,
    eventKey: "chapter_reaction",
    metadata: {
      chapter_id: input.chapterId,
      story_id: input.storyId,
      reaction_key: input.reactionKey
    },
    sourceId: input.chapterId,
    storyId: input.storyId,
    userId: user.id
  });

  revalidatePath(input.returnTo);
  redirect(input.returnTo);
}
