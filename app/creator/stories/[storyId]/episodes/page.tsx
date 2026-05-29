import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ storyId: string }>;
};

export default async function CreatorEpisodesLegacyPage({ params }: PageProps) {
  const { storyId } = await params;
  redirect(`/studio/stories/${storyId}/chapters`);
}
