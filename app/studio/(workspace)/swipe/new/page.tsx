import { SectionHeader, ErrorState } from "@/components/ui";
import { SwipeEditor } from "@/components/studio/swipe/SwipeEditor";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getCreatorStoriesForSwipe } from "@/lib/swipe/get-swipe-form-data";
import { createSwipeItemAction } from "@/lib/swipe/swipe-actions";
import { studioPath } from "@/lib/studio/constants";

export const dynamic = "force-dynamic";

export default async function StudioNewSwipePage() {
  const basePath = studioPath("/swipe/new");
  const { creatorProfile, error } = await getStudioAccess(basePath);

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Tạo nội dung Swipe" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const storiesResult = await getCreatorStoriesForSwipe(creatorProfile);

  return (
    <section className="space-y-6">
      <SectionHeader
        subtitle="Tự viết hook, nội dung và CTA — hệ thống chỉ hỗ trợ trích đoạn nếu bạn chọn."
        title="Tạo nội dung Swipe"
      />

      {storiesResult.error ? (
        <ErrorState message={storiesResult.error} title="Không tải được danh sách truyện" />
      ) : null}

      <SwipeEditor
        action={createSwipeItemAction}
        authorName={creatorProfile.pen_name}
        mode="create"
        stories={storiesResult.stories}
      />
    </section>
  );
}
