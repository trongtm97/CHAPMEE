import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryReviewDetail } from "@/components/admin/content/StoryReviewDetail";
import { ErrorState } from "@/components/ui";
import { getStoryForReview } from "@/lib/admin/getStoryForReview";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";

type AdminStoryReviewPageProps = {
  params: Promise<{ storyId: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminStoryReviewPage({
  params
}: AdminStoryReviewPageProps) {
  const { storyId } = await params;
  const guard = await requireAdminOrModerator(
    `/admin/content/stories/${storyId}`
  );

  if (!guard.ok) {
    return (
      <ErrorState
        message={guard.error}
        title="Không có quyền truy cập admin"
        variant="danger"
      />
    );
  }

  const result = await getStoryForReview(storyId);

  if (result.notFound) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <Link
        className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        href="/admin/content"
      >
        ← Content queue
      </Link>
      {result.story ? (
        <StoryReviewDetail story={result.story} />
      ) : (
        <ErrorState
          message={result.error}
          title="Không tải được chi tiết duyệt truyện"
        />
      )}
    </section>
  );
}
