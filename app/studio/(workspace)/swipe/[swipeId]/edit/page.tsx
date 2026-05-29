import { SectionHeader, ErrorState } from "@/components/ui";
import { SwipeEditor } from "@/components/studio/swipe/SwipeEditor";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  getChaptersForSwipeStory,
  getCreatorStoriesForSwipe,
  getSwipeItemForEdit
} from "@/lib/swipe/get-swipe-form-data";
import { updateSwipeItemAction } from "@/lib/swipe/swipe-actions";
import { studioPath } from "@/lib/studio/constants";

type EditSwipePageProps = {
  params: Promise<{ swipeId: string }>;
};

export const dynamic = "force-dynamic";

export default async function StudioEditSwipePage({ params }: EditSwipePageProps) {
  const { swipeId } = await params;
  const basePath = studioPath(`/swipe/${swipeId}/edit`);
  const { creatorProfile, error } = await getStudioAccess(basePath);
  const { profile } = await getCurrentUser();

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Sửa Swipe" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const [storiesResult, swipeResult] = await Promise.all([
    getCreatorStoriesForSwipe(creatorProfile),
    getSwipeItemForEdit(profile.id, swipeId)
  ]);

  if (!swipeResult.item) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Sửa Swipe" />
        <ErrorState
          message={swipeResult.error ?? "Không tìm thấy Swipe."}
          title="Không tải được Swipe"
        />
      </section>
    );
  }

  const chaptersResult = await getChaptersForSwipeStory(
    swipeResult.item.storyId,
    creatorProfile
  );

  return (
    <section className="space-y-6">
      <SectionHeader
        subtitle="Chỉnh sửa nội dung Swipe trước khi đăng hoặc lên lịch."
        title="Sửa Swipe"
      />

      <SwipeEditor
        action={updateSwipeItemAction}
        authorName={creatorProfile.pen_name}
        chapters={chaptersResult.chapters}
        initial={swipeResult.item}
        mode="edit"
        stories={storiesResult.stories}
        swipeId={swipeId}
      />
    </section>
  );
}
