import { redirect } from "next/navigation";

type LegacyNewEpisodePageProps = {
  params: Promise<{
    storyId: string;
  }>;
};

export default async function LegacyStudioNewEpisodePage({
  params
}: LegacyNewEpisodePageProps) {
  const { storyId } = await params;
  redirect(`/studio/stories/${storyId}/chapters/new`);
}
