import Link from "next/link";
import { ApproveButton } from "@/components/admin/content/ApproveButton";
import { RejectWithNoteForm } from "@/components/admin/content/RejectWithNoteForm";
import { Badge, Card, SectionHeader } from "@/components/ui";
import { StoryQualityModerationPanel } from "@/components/admin/content/StoryQualityModerationPanel";
import {
  approveStoryAction,
  rejectStoryAction
} from "@/lib/admin/contentActions";
import type { StoryForReview } from "@/lib/admin/getStoryForReview";

type StoryReviewDetailProps = {
  story: StoryForReview;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function canPublicPreview(status: string) {
  return status === "approved" || status === "published";
}

export function StoryReviewDetail({ story }: StoryReviewDetailProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <SectionHeader
          subtitle={`${story.creatorName ?? "Tác giả"} · ${story.genreName ?? "Chưa phân loại"}`}
          title={story.title}
        />
        <Badge variant={story.status === "pending" ? "warning" : "default"}>
          {story.status}
        </Badge>
      </div>

      <Card className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Slug</dt>
            <dd className="mt-1 text-zinc-200">{story.slug}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Visibility</dt>
            <dd className="mt-1 text-zinc-200">{story.visibility}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Created</dt>
            <dd className="mt-1 text-zinc-200">{formatDate(story.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Updated</dt>
            <dd className="mt-1 text-zinc-200">{formatDate(story.updatedAt)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Published</dt>
            <dd className="mt-1 text-zinc-200">
              {formatDate(story.publishedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Tags</dt>
            <dd className="mt-1 text-zinc-200">
              {story.tags.length ? story.tags.join(", ") : "Chưa có tag"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">Hook</p>
          <p className="mt-1 text-base font-semibold leading-7 text-white">
            {story.hook || "Chưa có hook"}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500">Short description</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            {story.shortDescription || "Chưa có mô tả ngắn"}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500">Long description</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-zinc-300">
            {story.longDescription || "Chưa có mô tả dài"}
          </p>
        </div>
      </Card>

      {canPublicPreview(story.status) ? (
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
          href={`/stories/${story.slug}`}
        >
          Mở public preview
        </Link>
      ) : null}

      {story.status === "pending" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form action={approveStoryAction}>
            <input name="story_id" type="hidden" value={story.id} />
            <ApproveButton />
          </form>
          <RejectWithNoteForm
            action={rejectStoryAction}
            idFieldName="story_id"
            idValue={story.id}
          />
        </div>
      ) : null}

      <StoryQualityModerationPanel storyId={story.id} storyTitle={story.title} />
    </section>
  );
}
