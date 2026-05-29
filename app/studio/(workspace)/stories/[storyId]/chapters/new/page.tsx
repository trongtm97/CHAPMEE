import { notFound } from "next/navigation";
import { StudioChapterEditor } from "@/components/studio/StudioChapterEditor";
import { ErrorState } from "@/components/ui";
import { createEpisodeAction } from "@/lib/creator/createEpisode";
import { getCreatorEpisodeFormData } from "@/lib/creator/getCreatorEpisodeById";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { studioStoryEpisodesHref } from "@/lib/studio/ownership";
import { getStudioDraftForEditor } from "@/lib/studio/get-draft";

type NewChapterPageProps = {
  params: Promise<{
    storyId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioNewChapterPage({
  params
}: NewChapterPageProps) {
  const { storyId } = await params;
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

  const { profile } = await getCurrentUser();
  const data = await getCreatorEpisodeFormData(creatorProfile, storyId);
  const savedDraft = profile?.id
    ? await getStudioDraftForEditor(profile.id, "chapter", storyId, null)
    : null;

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
        action={createEpisodeAction}
        authorPenName={creatorProfile.pen_name}
        backHref={studioStoryEpisodesHref(storyId)}
        defaultEpisodeNumber={data.nextEpisodeNumber}
        profileId={profile?.id ?? ""}
        savedDraft={savedDraft}
        story={data.story}
      />
    </section>
  );
}
