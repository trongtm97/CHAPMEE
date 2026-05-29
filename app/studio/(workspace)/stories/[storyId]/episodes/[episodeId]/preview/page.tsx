import { notFound } from "next/navigation";
import { StudioEpisodePreview } from "@/components/studio/preview/StudioEpisodePreview";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getCreatorEpisodeFormData } from "@/lib/creator/getCreatorEpisodeById";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { createExcerpt } from "@/lib/text/createExcerpt";

type StudioEpisodePreviewPageProps = {
  params: Promise<{
    storyId: string;
    episodeId: string;
  }>;
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioEpisodePreviewPage({
  params,
  searchParams
}: StudioEpisodePreviewPageProps) {
  const { episodeId, storyId } = await params;
  const resolvedSearchParams = await searchParams;
  const initialMode =
    resolvedSearchParams?.mode === "swipe" ? "swipe" : "reader";
  const { creatorProfile, error } = await getStudioAccess(
    `/studio/stories/${storyId}/episodes/${episodeId}/preview`
  );

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Xem trước chương" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const data = await getCreatorEpisodeFormData(
    creatorProfile,
    storyId,
    episodeId
  );

  if ((!data.story || !data.episode) && !data.error) {
    notFound();
  }

  return (
    <section className="space-y-6">
      {data.story && data.episode ? (
        <StudioEpisodePreview
          backHref={`/studio/stories/${storyId}/chapters/${episodeId}/edit`}
          content={data.episode.content}
          creatorName={creatorProfile.pen_name}
          episodeNumber={data.episode.episode_number}
          episodeStatus={data.episode.status}
          episodeTitle={data.episode.title}
          excerpt={data.episode.excerpt || createExcerpt(data.episode.content)}
          initialMode={initialMode}
          storyTitle={data.story.title}
        />
      ) : (
        <ErrorState
          message={data.error}
          title="Không tải được xem trước chương"
        />
      )}
    </section>
  );
}
