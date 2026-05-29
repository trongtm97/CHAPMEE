import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { CreatorStoryStatus } from "@/lib/creator/getCreatorStories";

export type OwnedCreatorStory = {
  id: string;
  title: string;
  slug: string;
  status: CreatorStoryStatus;
};

export type OwnedCreatorEpisode = {
  id: string;
  story_id: string;
  status: CreatorStoryStatus;
};

export class OwnershipError extends Error {
  constructor(message = "Bạn không có quyền thao tác trên tài nguyên này.") {
    super(message);
    this.name = "OwnershipError";
  }
}

export async function assertOwnsResourceUserId(
  resourceUserId: string | null | undefined,
  currentUserId: string
) {
  if (!resourceUserId || resourceUserId !== currentUserId) {
    throw new OwnershipError();
  }
}

export async function assertOwnsComment(commentId: string, currentUserId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, user_id, story_id, episode_id")
    .eq("id", commentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  await assertOwnsResourceUserId(data.user_id, currentUserId);
  return data;
}

export async function assertCreatorOwnsStory(
  creatorProfile: CreatorProfile,
  storyId: string
): Promise<OwnedCreatorStory> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select("id, title, slug, status")
    .eq("id", storyId)
    .eq("creator_id", creatorProfile.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  return data as OwnedCreatorStory;
}

export async function assertCreatorOwnsEpisode(
  creatorProfile: CreatorProfile,
  storyId: string,
  episodeId: string
): Promise<OwnedCreatorEpisode> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("episodes")
    .select("id, story_id, status, stories!inner(creator_id)")
    .eq("id", episodeId)
    .eq("story_id", storyId)
    .eq("stories.creator_id", creatorProfile.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  return data as OwnedCreatorEpisode;
}

export async function assertOwnsUserWallet(userId: string, currentUserId: string) {
  await assertOwnsResourceUserId(userId, currentUserId);
}
