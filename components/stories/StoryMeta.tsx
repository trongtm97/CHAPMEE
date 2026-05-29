import { Badge } from "@/components/ui";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";

type StoryMetaProps = {
  story: StoryDetail;
};

export function StoryMeta({ story }: StoryMetaProps) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <Badge variant={story.isCompleted ? "success" : "warning"}>
        {story.isCompleted ? "completed" : "ongoing"}
      </Badge>
      {story.genreName ? <Badge>{story.genreName}</Badge> : null}
      <Badge>{story.episodeCount} tập</Badge>
      {story.tags.map((tag) => (
        <Badge key={tag}>{tag}</Badge>
      ))}
    </div>
  );
}
