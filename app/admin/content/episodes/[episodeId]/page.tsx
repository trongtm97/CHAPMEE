import Link from "next/link";
import { notFound } from "next/navigation";
import { EpisodeReviewDetail } from "@/components/admin/content/EpisodeReviewDetail";
import { ErrorState } from "@/components/ui";
import { getEpisodeForReview } from "@/lib/admin/getEpisodeForReview";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";

type AdminEpisodeReviewPageProps = {
  params: Promise<{ episodeId: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminEpisodeReviewPage({
  params
}: AdminEpisodeReviewPageProps) {
  const { episodeId } = await params;
  const guard = await requireAdminOrModerator(
    `/admin/content/episodes/${episodeId}`
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

  const result = await getEpisodeForReview(episodeId);

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
      {result.episode ? (
        <EpisodeReviewDetail episode={result.episode} />
      ) : (
        <ErrorState
          message={result.error}
          title="Không tải được chi tiết duyệt chương"
        />
      )}
    </section>
  );
}
