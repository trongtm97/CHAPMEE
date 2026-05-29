import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioBulkImportPage } from "@/components/studio/import/StudioBulkImportPage";
import { ErrorState, SectionHeader } from "@/components/ui";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getExistingEpisodeNumbers } from "@/lib/import/import-chapters-as-drafts";
import { studioPath } from "@/lib/studio/constants";
import { createClient } from "@/lib/supabase/server";

type StoryImportPageProps = {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{ imported?: string; skipped?: string }>;
};

export const dynamic = "force-dynamic";

export default async function StoryBulkImportPage({ params }: StoryImportPageProps) {
  const { storyId } = await params;
  const basePath = studioPath(`/stories/${storyId}/import`);
  const { creatorProfile, error } = await getStudioAccess(basePath);

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Nhập hàng loạt" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  let story: { id: string; title: string };

  try {
    story = await assertCreatorOwnsStory(creatorProfile, storyId);
  } catch {
    notFound();
  }

  const supabase = await createClient();
  const existingEpisodeNumbers = await getExistingEpisodeNumbers(supabase, storyId);

  return (
    <section className="space-y-6">
      <Link
        className="text-sm font-semibold text-sky-300 hover:text-sky-200"
        href={studioPath(`/stories/${storyId}/chapters`)}
      >
        ← Quay lại danh sách chương
      </Link>

      <SectionHeader
        subtitle="Dán nội dung hoặc tải file .txt theo mẫu để tạo nhiều chương nháp cùng lúc."
        title="Nhập hàng loạt"
      />

      <StudioBulkImportPage
        existingEpisodeNumbers={existingEpisodeNumbers}
        storyId={storyId}
        storyTitle={story.title}
      />
    </section>
  );
}
