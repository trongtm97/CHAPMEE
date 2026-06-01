import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorState, SectionHeader } from "@/components/ui";
import { StudioStoryForm } from "@/components/studio/stories/StudioStoryForm";
import { updateStoryAction } from "@/lib/creator/updateStory";
import { getStoryFormData } from "@/lib/creator/getStoryFormData";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getStudioDraftForEditor } from "@/lib/studio/get-draft";

type EditStoryPageProps = {
  params: Promise<{
    storyId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioEditStoryPage({
  params
}: EditStoryPageProps) {
  const { storyId } = await params;
  const { creatorProfile, error } = await getStudioAccess(
    `/studio/stories/${storyId}/edit`
  );

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Chỉnh sửa truyện" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const { profile } = await getCurrentUser();
  const formData = await getStoryFormData(creatorProfile, storyId);
  const savedDraft = profile?.id
    ? await getStudioDraftForEditor(profile.id, "story", storyId, null)
    : null;

  if (!formData.story && !formData.error) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <Link
        className="text-sm font-semibold text-sky-300 hover:text-sky-200"
        href="/studio/stories"
      >
        Trở về danh sách truyện
      </Link>
      {formData.story ? (
        <>
          <SectionHeader
            subtitle="Cập nhật nội dung trước khi gửi duyệt."
            title={formData.story.title}
          />
          <StudioStoryForm
            action={updateStoryAction}
            authorDisplayName={creatorProfile.display_name}
            basePath="/studio"
            currentImage={formData.currentImage}
            profileId={profile?.id ?? ""}
            savedDraft={savedDraft}
            story={formData.story}
            taxonomy={formData.taxonomy}
          />
        </>
      ) : (
        <ErrorState message={formData.error} title="Không tải được form truyện" />
      )}
    </section>
  );
}
