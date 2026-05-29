import { notFound } from "next/navigation";
import { StudioChapterEditor } from "@/components/studio/StudioChapterEditor";
import { ErrorState } from "@/components/ui";
import { getCreatorEpisodeFormData } from "@/lib/creator/getCreatorEpisodeById";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { studioStoryEpisodesHref } from "@/lib/studio/ownership";
import { getStudioDraftForEditor } from "@/lib/studio/get-draft";
import { updateEpisodeAction } from "@/lib/creator/updateEpisode";

type EditChapterPageProps = {
  params: Promise<{
    storyId: string;
    chapterId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioEditChapterPage({
  params
}: EditChapterPageProps) {
  const { chapterId, storyId } = await params;
  const { creatorProfile, error } = await getStudioAccess(
    `/studio/stories/${storyId}/chapters/${chapterId}/edit`
  );

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const { profile } = await getCurrentUser();
  const data = await getCreatorEpisodeFormData(
    creatorProfile,
    storyId,
    chapterId
  );
  const savedDraft = profile?.id
    ? await getStudioDraftForEditor(profile.id, "chapter", storyId, chapterId)
    : null;

  if ((!data.story || !data.episode) && !data.error) {
    notFound();
  }

  if (!data.story || !data.episode) {
    return (
      <ErrorState message={data.error} title="Không tải được form chương" />
    );
  }

  return (
    <section className="space-y-4">
      <StudioChapterEditor
        action={updateEpisodeAction}
        authorPenName={creatorProfile.pen_name}
        backHref={studioStoryEpisodesHref(storyId)}
        defaultEpisodeNumber={data.episode.episode_number}
        episode={data.episode}
        profileId={profile?.id ?? ""}
        savedDraft={savedDraft}
        story={data.story}
      />
    </section>
  );
}
