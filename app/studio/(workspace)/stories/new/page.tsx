import Link from "next/link";
import { ErrorState } from "@/components/ui";
import { MobileBackHeader } from "@/components/me/MobileBackHeader";
import { StudioStoryCreateWizard } from "@/components/studio/stories/create/StudioStoryCreateWizard";
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
        <h1 className="text-xl font-bold text-white">Viết truyện mới</h1>
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const { profile } = await getCurrentUser();
  const formData = await getStoryFormData(creatorProfile);

  return (
    <section className="space-y-4 pb-8">
      <MobileBackHeader fallbackHref="/me?tab=writing" title="Viết truyện mới" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Tạo truyện mới</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Bốn bước: thông tin → phân loại → composer → SEO & xuất bản.
          </p>
        </div>
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/studio/stories"
        >
          Danh sách truyện
        </Link>
      </div>
      {formData.error ? (
        <ErrorState message={formData.error} title="Không tải được form truyện" />
      ) : (
        <StudioStoryCreateWizard
          action={createStoryAction}
          authorDisplayName={creatorProfile.display_name}
          authorUsername={profile?.username ?? null}
          basePath="/studio"
          profileId={profile?.id ?? ""}
          savedDraft={null}
          taxonomy={formData.taxonomy}
        />
      )}
    </section>
  );
}
