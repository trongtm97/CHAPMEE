import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import type { CreatorStory } from "@/lib/creator/getCreatorStories";

type CreatorStoryCardProps = {
  story: CreatorStory;
  basePath?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function canViewPublicPage(status: CreatorStory["status"]) {
  return status === "published" || status === "approved";
}

export function CreatorStoryCard({
  basePath = "/studio",
  story
}: CreatorStoryCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white">{story.title}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {story.genreName ?? "Chưa chọn thể loại"} · {story.episodeCount} chap
          </p>
        </div>
        <Badge>{story.status}</Badge>
      </div>

      {story.hook ? (
        <p className="line-clamp-3 text-sm leading-6 text-zinc-300">
          {story.hook}
        </p>
      ) : (
        <p className="text-sm leading-6 text-zinc-500">
          Chưa có hook cho truyện này.
        </p>
      )}

      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Cập nhật {formatDate(story.updatedAt)}
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
          href={`${basePath}/stories/${story.id}/edit`}
        >
          Edit
        </Link>
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
          href={`${basePath}/stories/${story.id}/episodes`}
        >
          Manage episodes
        </Link>
        {canViewPublicPage(story.status) ? (
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
            href={getStoryDetailHref({
              slug: story.slug,
              public_code: story.publicCode
            })}
          >
            View public page
          </Link>
        ) : (
          <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-500">
            Chưa public
          </span>
        )}
      </div>
    </Card>
  );
}
