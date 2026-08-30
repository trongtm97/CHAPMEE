import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { PublicCodeCopy } from "@/components/studio/import/PublicCodeCopy";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import type { CreatorStoryFormStory } from "@/lib/creator/getStoryFormData";

type StoryFormSidePanelProps = {
  basePath?: string;
  story?: CreatorStoryFormStory | null;
  canSaveDraft: boolean;
};

function canViewPublicPage(story?: CreatorStoryFormStory | null) {
  return (
    story?.visibility === "public" &&
    (story.status === "approved" || story.status === "published")
  );
}

export function StoryFormSidePanel({
  basePath = "/studio",
  canSaveDraft,
  story
}: StoryFormSidePanelProps) {
  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">
              Trạng thái
            </p>
            <h2 className="mt-2 text-lg font-bold text-white">Story</h2>
          </div>
          <Badge>{story?.status ?? "draft"}</Badge>
        </div>

        <div className="grid gap-2 text-sm text-zinc-300">
          <Row label="Visibility" value={story?.visibility ?? "private"} />
          <Row label="Saved as draft" value={canSaveDraft ? "Yes" : "Locked"} />
          <Row
            label="Public page"
            value={canViewPublicPage(story) ? "Available" : "Hidden"}
          />
        </div>

        {story?.publicCode ? (
          <PublicCodeCopy code={story.publicCode} label="Mã truyện (story_code)" />
        ) : null}

        <div className="grid gap-2">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/10"
            href={`${basePath}/stories`}
          >
            Back to Stories
          </Link>
          {canViewPublicPage(story) ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
              href={
                story?.slug && story.publicCode
                  ? getStoryDetailHref({
                      slug: story.slug,
                      public_code: story.publicCode
                    })
                  : "#"
              }
            >
              View Public Page
            </Link>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">
          Guidance
        </p>
        <ul className="space-y-2 text-sm leading-6 text-zinc-300">
          <li>Hook should be strong.</li>
          <li>Short description should sell the story quickly.</li>
          <li>Tags should reflect motif and genre.</li>
        </ul>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-zinc-500">{label}</span>
      <span className="font-semibold text-zinc-100">{value}</span>
    </div>
  );
}
