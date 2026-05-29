import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COMMUNITY_PAGE_SHELL_CLASS } from "@/components/community/community-page-shell";
import { CommunityPostDetail } from "@/components/community/CommunityPostDetail";
import { ErrorState } from "@/components/ui";
import { getCommunityPostComments } from "@/lib/comments/getComments";
import { getCommunityPost } from "@/lib/community/getCommunityPost";

export const dynamic = "force-dynamic";

type CommunityPostPageProps = {
  params: Promise<{ postId: string }>;
};

export async function generateMetadata({
  params
}: CommunityPostPageProps): Promise<Metadata> {
  const { postId } = await params;
  const { post } = await getCommunityPost(postId);

  if (!post) {
    return { title: "Bài viết không tồn tại" };
  }

  return {
    title: post.title,
    description: post.contentPreview.slice(0, 160)
  };
}

export default async function CommunityPostPage({ params }: CommunityPostPageProps) {
  const { postId } = await params;
  const [{ error, post }, commentBundle] = await Promise.all([
    getCommunityPost(postId),
    getCommunityPostComments({ communityPostId: postId })
  ]);

  if (error) {
    return (
      <section className="page-stack">
        <ErrorState message={error} title="Không thể tải bài viết" />
      </section>
    );
  }

  if (!post) {
    notFound();
  }

  return (
    <section className={`page-stack ${COMMUNITY_PAGE_SHELL_CLASS}`}>
      <CommunityPostDetail
        comments={commentBundle.comments}
        commentsEnabled={!commentBundle.error}
        post={post}
      />
    </section>
  );
}
