import { notFound } from "next/navigation";
import { StudioFilmWorkspace } from "@/components/studio/films/StudioFilmWorkspace";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getStudioFilmsPageData } from "@/lib/studio/get-studio-films-page";
import { studioPath } from "@/lib/studio/constants";

type StudioStoryFilmsPageProps = {
  params: Promise<{ storyId: string }>;
};

export const dynamic = "force-dynamic";

export default async function StudioStoryFilmsPage({ params }: StudioStoryFilmsPageProps) {
  const { storyId } = await params;
  const basePath = studioPath(`/stories/${storyId}/films`);
  const { creatorProfile, error } = await getStudioAccess(basePath);

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Phim chuyển thể" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const data = await getStudioFilmsPageData(creatorProfile, storyId);
  if (!data.story.title && !data.error) {
    notFound();
  }

  if (data.error && data.items.length === 0) {
    return (
      <section className="space-y-6">
        <ErrorState message={data.error} title="Không tải được phim chuyển thể" />
      </section>
    );
  }

  return <StudioFilmWorkspace data={data} />;
}
