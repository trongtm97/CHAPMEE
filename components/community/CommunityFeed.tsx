import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import { EmptyState, SectionHeader } from "@/components/ui";
import { enrichCommunityPosts } from "@/lib/community/build-unified-feed";
import type {
  CommunityPost,
  CommunityPostType
} from "@/lib/community/getCommunityFeed";

type CommunityFeedProps = {
  posts: CommunityPost[];
};

type CommunitySection = {
  title: string;
  subtitle: string;
  types: CommunityPostType[];
};

const sections: CommunitySection[] = [
  {
    title: "Thử thách viết truyện",
    subtitle: "Tham gia challenge, vote bài viết và khám phá tác giả mới.",
    types: ["challenge"]
  },
  {
    title: "Thảo luận mới",
    subtitle: "Các chủ đề đã duyệt quanh truyện, tác giả và thể loại.",
    types: ["discussion"]
  },
  {
    title: "Review ngắn",
    subtitle: "Cảm nhận ngắn gọn, an toàn, có kiểm duyệt.",
    types: ["review"]
  },
  {
    title: "Bình chọn",
    subtitle: "Vote nhanh quanh truyện, nhân vật và mood đọc.",
    types: ["poll_placeholder"]
  }
];

export function CommunityFeed({ posts }: CommunityFeedProps) {
  const enrichedPosts = enrichCommunityPosts(posts);

  return (
    <div className="space-y-8">
      {sections.map((section) => {
        const sectionPosts = enrichedPosts.filter((post) =>
          section.types.includes(post.type)
        );

        return (
          <section className="space-y-3" key={section.title}>
            <SectionHeader subtitle={section.subtitle} title={section.title} />
            {sectionPosts.length ? (
              <div className="space-y-3">
                {sectionPosts.map((post) => (
                  <CommunityPostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <EmptyState
                description="Khi có bài đã được duyệt, nội dung sẽ xuất hiện tại đây."
                title="Chưa có bài"
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
