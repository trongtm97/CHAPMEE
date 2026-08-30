import Link from "next/link";
import { CreatorStudioCard } from "@/components/me/CreatorStudioCard";
import { Card, SectionHeader } from "@/components/ui";
import type { MePageData } from "@/types/me-page";

type WritingTabProps = {
  data: MePageData;
};

const statusLabels: Record<string, string> = {
  draft: "Nháp",
  pending: "Chờ duyệt",
  published: "Đã đăng",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  archived: "Lưu trữ"
};

export function WritingTab({ data }: WritingTabProps) {
  const isCreator = Boolean(data.creatorProfile);
  const recentStories = data.recentCreatorStories;

  if (!isCreator) {
    return (
      <div className="space-y-4">
        <Card className="space-y-3 p-4 text-center">
          <h2 className="text-base font-bold text-white">Bắt đầu viết trên ChapMee</h2>
          <p className="text-xs leading-5 text-zinc-500">
            Tạo truyện đầu tiên, mở Studio và chia sẻ với độc giả.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              className="inline-flex min-h-9 items-center justify-center rounded-full bg-cyan-300 px-4 text-xs font-bold text-zinc-950"
              href="/studio"
            >
              Bắt đầu viết
            </Link>
            <Link
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/12 px-4 text-xs font-semibold text-zinc-200"
              href="/studio/stories/new"
            >
              Tạo truyện đầu tiên
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CreatorStudioCard
        creatorProfile={data.creatorProfile}
        stats={data.creatorStats}
      />

      {recentStories.length > 0 ? (
        <section className="space-y-2">
          <SectionHeader
            action={
              <Link className="text-xs font-semibold text-cyan-200" href="/studio/stories">
                Xem tất cả
              </Link>
            }
            title="Truyện gần đây"
          />
          <div className="space-y-2">
            {recentStories.map((story) => (
              <Link href={`/studio/stories/${story.id}/edit`} key={story.id}>
                <Card className="flex items-center justify-between gap-3 p-3 transition hover:border-cyan-300/20">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{story.title}</p>
                    <p className="mt-0.5 text-[0.65rem] text-zinc-500">
                      {statusLabels[story.status] ?? story.status}
                    </p>
                  </div>
                  <span className="shrink-0 text-zinc-600">→</span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Card className="flex flex-wrap gap-2 p-3">
        <ActionLink href="/studio" label="Mở Studio" />
        <ActionLink href="/studio/stories/new" label="Đăng truyện" />
        <ActionLink href="/studio/drafts" label="Nháp" />
      </Card>
    </div>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex min-h-8 items-center rounded-full border border-white/10 px-3 text-xs font-semibold text-zinc-200 transition hover:border-cyan-300/25 hover:text-cyan-100"
      href={href}
    >
      {label}
    </Link>
  );
}
