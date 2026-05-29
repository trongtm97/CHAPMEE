import Link from "next/link";
import { ApproveButton } from "@/components/admin/content/ApproveButton";
import { RejectButton } from "@/components/admin/content/RejectButton";
import { Badge, Card } from "@/components/ui";
import {
  approveStoryAction,
  rejectStoryAction
} from "@/lib/admin/contentActions";
import type { PendingStory } from "@/lib/admin/getPendingContent";

type PendingStoryCardProps = {
  story: PendingStory;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function PendingStoryCard({ story }: PendingStoryCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-zinc-400">
            {story.creatorName ?? "Tác giả"} · {story.genreName ?? "Chưa phân loại"}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {story.title}
          </h2>
        </div>
        <Badge variant="warning">{story.status}</Badge>
      </div>

      {story.hook ? (
        <p className="text-sm leading-6 text-zinc-300">{story.hook}</p>
      ) : null}
      {story.shortDescription ? (
        <p className="text-sm leading-6 text-zinc-400">
          {story.shortDescription}
        </p>
      ) : null}
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Tạo ngày {formatDate(story.createdAt)}
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
          href={`/admin/content/stories/${story.id}`}
        >
          Review
        </Link>
        <form action={approveStoryAction}>
          <input name="story_id" type="hidden" value={story.id} />
          <ApproveButton />
        </form>
        <form action={rejectStoryAction}>
          <input name="story_id" type="hidden" value={story.id} />
          <RejectButton />
        </form>
      </div>
    </Card>
  );
}
