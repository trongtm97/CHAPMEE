import { redirect } from "next/navigation";
import { studioPath } from "@/lib/studio/constants";

type LegacyEpisodesListPageProps = {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function LegacyStudioEpisodesListPage({
  params,
  searchParams
}: LegacyEpisodesListPageProps) {
  const { storyId } = await params;
  const query = await searchParams;
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      search.set(key, value);
    }
  }

  const suffix = search.toString();
  const destination = suffix
    ? `${studioPath(`/stories/${storyId}/chapters`)}?${suffix}`
    : studioPath(`/stories/${storyId}/chapters`);

  redirect(destination);
}
