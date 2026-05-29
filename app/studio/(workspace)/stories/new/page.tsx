import Link from "next/link";
import { ErrorState, SectionHeader } from "@/components/ui";
import { MobileBackHeader } from "@/components/me/MobileBackHeader";
import { StudioStoryForm } from "@/components/studio/stories/StudioStoryForm";
import { createStoryAction } from "@/lib/creator/createStory";
import { getStoryFormData } from "@/lib/creator/getStoryFormData";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getStudioDraftForEditor } from "@/lib/studio/get-draft";

export const dynamic = "force-dynamic";

export default async function StudioNewStoryPage() {
  const { creatorProfile, error } = await getStudioAccess("/studio/stories/new");

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Viết truyện mới" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const { profile } = await getCurrentUser();
  const formData = await getStoryFormData(creatorProfile);
  const savedDraft = profile?.id
    ? await getStudioDraftForEditor(profile.id, "story", null, null)
    : null;

  return (
    <section className="space-y-6">
      <MobileBackHeader fallbackHref="/me?tab=writing" title="Viết truyện mới" />
      <Link
        className="text-sm font-semibold text-sky-300 hover:text-sky-200"
        href="/studio/stories"
      >
        Trở về danh sách truyện
      </Link>
      <SectionHeader
        subtitle="Tạo bản nháp trước, rồi gửi duyệt khi sẵn sàng."
        title="Viết truyện mới"
      />
      {formData.error ? (
        <ErrorState message={formData.error} title="Không tải được form truyện" />
      ) : (
        <StudioStoryForm
          action={createStoryAction}
          authorPenName={creatorProfile.pen_name}
          basePath="/studio"
          genres={formData.genres}
          profileId={profile?.id ?? ""}
          savedDraft={savedDraft}
          tags={formData.tags}
        />
      )}
    </section>
  );
}
