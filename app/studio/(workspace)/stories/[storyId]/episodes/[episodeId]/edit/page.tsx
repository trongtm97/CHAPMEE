import { redirect } from "next/navigation";

type LegacyEditEpisodePageProps = {
  params: Promise<{
    storyId: string;
    episodeId: string;
  }>;
};

export default async function LegacyStudioEditEpisodePage({
  params
}: LegacyEditEpisodePageProps) {
  const { episodeId, storyId } = await params;
  redirect(`/studio/stories/${storyId}/chapters/${episodeId}/edit`);
}
