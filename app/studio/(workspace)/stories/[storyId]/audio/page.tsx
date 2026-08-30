import { notFound } from "next/navigation";
import { StudioAudioWorkspace } from "@/components/studio/audio/StudioAudioWorkspace";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getStudioAudioPageData } from "@/lib/studio/get-studio-audio-page";
import { studioPath } from "@/lib/studio/constants";
import { buildStoryAudioQueue } from "@/src/lib/audio/audio-queue";

type StudioStoryAudioPageProps = {
  params: Promise<{ storyId: string }>;
};

export const dynamic = "force-dynamic";

export default async function StudioStoryAudioPage({ params }: StudioStoryAudioPageProps) {
  const { storyId } = await params;
  const basePath = studioPath(`/stories/${storyId}/audio`);
  const { creatorProfile, error } = await getStudioAccess(basePath);

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Audio" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const data = await getStudioAudioPageData(creatorProfile, storyId);
  if (!data.story.title && !data.error) {
    notFound();
  }

  if (data.error && data.items.length === 0) {
    return (
      <section className="space-y-6">
        <ErrorState message={data.error} title="Không tải được audio companion" />
      </section>
    );
  }

  const queue = await buildStoryAudioQueue(storyId);

  return <StudioAudioWorkspace data={data} queue={queue} />;
}
