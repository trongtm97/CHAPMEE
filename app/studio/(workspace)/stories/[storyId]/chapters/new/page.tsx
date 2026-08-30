import { notFound, redirect } from "next/navigation";
import { StudioChapterEditor } from "@/components/studio/StudioChapterEditor";
import { ErrorState } from "@/components/ui";
import { getCreatorEpisodeFormData } from "@/lib/creator/getCreatorEpisodeById";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { studioStoryEpisodesHref } from "@/lib/studio/ownership";
import { getStudioDraftForEditor } from "@/lib/studio/get-draft";
import { createClient } from "@/lib/data/server";
import { studioPath } from "@/lib/studio/constants";

type NewChapterPageProps = {
  params: Promise<{
    storyId: string;
  }>;
  searchParams: Promise<{
    title?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioNewChapterPage({
  params,
  searchParams
}: NewChapterPageProps) {
  const { storyId } = await params;
  const { title: defaultTitle } = await searchParams;
  const { creatorProfile, error } = await getStudioAccess(
    `/studio/stories/${storyId}/chapters/new`
  );

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const db = await createClient();
  const { data: structureRow } = await db
    .from("stories")
    .select("structure_type")
    .eq("id", storyId)
    .eq("creator_id", creatorProfile.id)
    .maybeSingle();

  if (structureRow?.structure_type === "standalone") {
    redirect(studioPath(`/stories/${storyId}/content`));
  }

  const { profile } = await getCurrentUser();
  const data = await getCreatorEpisodeFormData(creatorProfile, storyId);

  if (!data.story && !data.error) {
    notFound();
  }

  if (!data.story) {
    return (
      <ErrorState message={data.error} title="Không tải được form chương" />
    );
  }

  return (
    <section className="space-y-4">
      <StudioChapterEditor
        authorDisplayName={creatorProfile.display_name}
        backHref={studioStoryEpisodesHref(storyId)}
        defaultEpisodeNumber={data.nextEpisodeNumber}
        defaultTitle={defaultTitle?.trim() || undefined}
        profileId={profile?.id ?? ""}
        savedDraft={null}
        story={data.story}
      />
    </section>
  );
}
