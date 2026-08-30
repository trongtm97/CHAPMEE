import { resolveContentPostCoverUrl } from "@/lib/platform-content/resolve-content-post-media";
import type { AdminContentPost } from "@/types/platform-content";

export type ContentPostWithCoverDisplay = AdminContentPost & {
  coverDisplayUrl: string | null;
};

export async function enrichContentPostCoverDisplay(
  post: AdminContentPost
): Promise<ContentPostWithCoverDisplay> {
  return {
    ...post,
    coverDisplayUrl: await resolveContentPostCoverUrl(post)
  };
}

export async function enrichContentPostsCoverDisplay(
  posts: AdminContentPost[]
): Promise<ContentPostWithCoverDisplay[]> {
  return Promise.all(posts.map(enrichContentPostCoverDisplay));
}
