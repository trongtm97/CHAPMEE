import { CommentInboxList } from "@/components/studio/CommentInboxList";
import { StoryCommunityShortcut } from "@/components/studio/StoryCommunityShortcut";
import { ErrorState } from "@/components/ui";
import type { StudioCommentsPageData, StudioCommentFilter } from "@/types/comments";

type StudioCommentsPageProps = {
  data: StudioCommentsPageData;
  activeFilter: StudioCommentFilter;
  activeStoryId?: string;
  searchQuery?: string;
};

export function StudioCommentsPage({
  data,
  activeFilter,
  activeStoryId,
  searchQuery
}: StudioCommentsPageProps) {
  if (data.error) {
    return <ErrorState message={data.error} title="Không tải được bình luận" />;
  }

  return (
    <div className="space-y-8">
      <CommentInboxList
        activeFilter={activeFilter}
        activeStoryId={activeStoryId}
        comments={data.comments}
        searchQuery={searchQuery}
        stories={data.stories}
      />
      <StoryCommunityShortcut groups={data.storyGroups} />
    </div>
  );
}
