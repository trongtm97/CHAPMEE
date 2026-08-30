import { notFound, redirect } from "next/navigation";
import { StudioStandaloneContentEditor } from "@/components/studio/stories/StudioStandaloneContentEditor";
import { ErrorState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStoryFormData } from "@/lib/creator/getStoryFormData";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { updateStandaloneStoryContentAction } from "@/lib/creator/updateStandaloneStoryContent";
import { createClient } from "@/lib/data/server";
import { isStandaloneStory, mapStoryStructureFromRow } from "@/lib/stories/story-structure";
import { studioStoryEditHref } from "@/lib/studio/ownership";

type StandaloneContentPageProps = {
  params: Promise<{ storyId: string }>;
};

export const dynamic = "force-dynamic";

export default async function StandaloneContentPage({
  params
}: StandaloneContentPageProps) {
  const { storyId } = await params;
  const { creatorProfile, error } = await getStudioAccess(
    `/studio/stories/${storyId}/content`
  );

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const formData = await getStoryFormData(creatorProfile, storyId);
  if (!formData.story) {
    notFound();
  }

  const db = await createClient();
  const { data: structureRow } = await db
    .from("stories")
    .select(
      "structure_type, content_format, standalone_content_json, standalone_plain_text, standalone_word_count, standalone_reading_time_minutes, standalone_published_at, standalone_updated_at"
    )
    .eq("id", storyId)
    .maybeSingle();

  const structure = mapStoryStructureFromRow(structureRow ?? {});

  if (!isStandaloneStory(structure)) {
    redirect(studioStoryEditHref(storyId));
  }

  const { profile } = await getCurrentUser();
  const presentationMode =
    formData.taxonomy.presentationMode ?? structure.contentFormat ?? "standard_prose";

  return (
    <StudioStandaloneContentEditor
      action={updateStandaloneStoryContentAction}
      basePath="/studio"
      coverUrl={formData.story.cover_url}
      hasCover={Boolean(formData.story.cover_url)}
      hook={formData.story.hook}
      initialPlainText={structure.standalonePlainText}
      initialStructuredContent={structure.standaloneContentJson}
      longDescription={formData.story.long_description}
      presentationMode={presentationMode as import("@/types/presentation").PresentationMode}
      profileId={profile?.id ?? creatorProfile.user_id}
      seoDescription={formData.story.seo_description}
      shortDescription={formData.story.short_description}
      storyId={storyId}
      storyStatus={formData.story.status}
      storyTitle={formData.story.title}
      storyVisibility={formData.story.visibility}
    />
  );
}
