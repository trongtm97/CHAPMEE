import { createClient } from "@/lib/data/server";
import { studioPath } from "@/lib/studio/constants";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";

export type CreatorTaxonomyRevisionItem = {
  id: string;
  storyId: string;
  storyTitle: string;
  storySlug: string;
  reason: string;
  requiredChanges: Record<string, unknown>;
  status: "open" | "creator_submitted" | "approved" | "rejected" | "cancelled";
  dueAt: string | null;
  editUrl: string;
  createdAt: string;
};

export async function getCreatorTaxonomyRevisionRequests(
  creatorProfile: CreatorProfile
): Promise<{ items: CreatorTaxonomyRevisionItem[]; openCount: number }> {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_taxonomy_revision_requests")
    .select(
      "id, story_id, reason, required_changes_json, status, due_at, created_at, stories!inner(title, slug)"
    )
    .eq("creator_id", creatorProfile.id)
    .in("status", ["open", "creator_submitted"])
    .order("created_at", { ascending: false });

  if (error) {
    return { items: [], openCount: 0 };
  }

  const items: CreatorTaxonomyRevisionItem[] = (data ?? [])
    .map((row) => {
      const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
      if (!story) return null;
      return {
      id: String(row.id),
      storyId: String(row.story_id),
      storyTitle: story.title,
      storySlug: story.slug,
      reason: row.reason,
      requiredChanges: (row.required_changes_json as Record<string, unknown>) ?? {},
      status: row.status,
      dueAt: row.due_at ? String(row.due_at) : null,
      editUrl: studioPath(`/stories/${row.story_id}/edit`),
      createdAt: String(row.created_at)
    };
    })
    .filter((row): row is CreatorTaxonomyRevisionItem => row != null);

  return {
    items,
    openCount: items.filter((i) => i.status === "open").length
  };
}
