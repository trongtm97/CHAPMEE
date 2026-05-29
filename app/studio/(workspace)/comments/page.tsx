import Link from "next/link";
import { StudioCommentsPage } from "@/components/studio/StudioCommentsPage";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  getStudioComments,
  normalizeStudioCommentFilter
} from "@/lib/studio/get-studio-comments";

type StudioCommentsRouteProps = {
  searchParams: Promise<{
    filter?: string;
    story?: string;
    q?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioCommentsRoute({
  searchParams
}: StudioCommentsRouteProps) {
  const params = await searchParams;
  const activeFilter = normalizeStudioCommentFilter(params.filter);
  const { creatorProfile, error } = await getStudioAccess("/studio/comments");
  const { profile } = await getCurrentUser();

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Bình luận" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const data = await getStudioComments(creatorProfile, profile.id, {
    filter: activeFilter,
    storyId: params.story,
    q: params.q
  });

  return (
    <section className="space-y-6">
      <Link
        className="text-sm font-semibold text-sky-300 hover:text-sky-200"
        href="/studio"
      >
        Trở về tổng quan
      </Link>

      <SectionHeader
        subtitle="Theo dõi và phản hồi người đọc quanh truyện của bạn."
        title="Bình luận"
      />

      <StudioCommentsPage
        activeFilter={activeFilter}
        activeStoryId={params.story}
        data={data}
        searchQuery={params.q}
      />
    </section>
  );
}
