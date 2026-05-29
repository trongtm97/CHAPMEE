import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ storyId: string; episodeId: string }>;
};

export default async function CreatorEpisodePreviewLegacyPage({ params }: PageProps) {
  const { storyId, episodeId } = await params;
  redirect(`/studio/stories/${storyId}/episodes/${episodeId}/preview`);
}
