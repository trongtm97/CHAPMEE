import { SectionHeader, ErrorState } from "@/components/ui";
import { ReelsEditor } from "@/components/studio/reels/ReelsEditor";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  getChaptersForReelsStory,
  getCreatorStoriesForReels,
  getReelsItemForEdit
} from "@/lib/reels/get-reels-form-data";
import { updateReelsItemAction } from "@/lib/reels/reels-actions";
import { studioReelsPath } from "@/lib/routes/reels-paths";

type EditReelsPageProps = {
  params: Promise<{ reelId: string }>;
};

export const dynamic = "force-dynamic";

export default async function StudioEditReelsPage({ params }: EditReelsPageProps) {
  const { reelId } = await params;
  const basePath = studioReelsPath(`/${reelId}/edit`);
  const { creatorProfile, error } = await getStudioAccess(basePath);
  const { profile } = await getCurrentUser();

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Sửa Reels" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const [storiesResult, reelsResult] = await Promise.all([
    getCreatorStoriesForReels(creatorProfile),
    getReelsItemForEdit(profile.id, reelId)
  ]);

  if (!reelsResult.item) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Sửa Reels" />
        <ErrorState
          message={reelsResult.error ?? "Không tìm thấy Reels."}
          title="Không tải được Reels"
        />
      </section>
    );
  }

  const chaptersResult = await getChaptersForReelsStory(
    reelsResult.item.storyId,
    creatorProfile
  );

  return (
    <section className="space-y-6">
      <SectionHeader
        subtitle="Chỉnh sửa Reels trước khi đăng hoặc lên lịch."
        title="Sửa Reels"
      />

      <ReelsEditor
        action={updateReelsItemAction}
        authorName={creatorProfile.display_name}
        chapters={chaptersResult.chapters}
        initial={reelsResult.item}
        mode="edit"
        reelId={reelId}
        stories={storiesResult.stories}
      />
    </section>
  );
}
