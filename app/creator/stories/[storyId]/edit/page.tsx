import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ storyId: string }>;
};

export default async function CreatorEditStoryLegacyPage({ params }: PageProps) {
  const { storyId } = await params;
  redirect(`/studio/stories/${storyId}/edit`);
}
