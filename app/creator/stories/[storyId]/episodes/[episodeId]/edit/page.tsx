import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ storyId: string; episodeId: string }>;
};

export default async function CreatorEditEpisodeLegacyPage({ params }: PageProps) {
  const { storyId, episodeId } = await params;
  redirect(`/studio/stories/${storyId}/chapters/${episodeId}/edit`);
}
