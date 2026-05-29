import Link from "next/link";
import { StoryImageThumb } from "@/components/common/StoryImageView";
import { Button, Card, EmptyState } from "@/components/ui";
import type { PublicWorkItem } from "@/types/public-profile";

type PublicWorksTabProps = {
  works: PublicWorkItem[];
  username: string;
  total: number;
  page: number;
};

export function PublicWorksTab({ page, total, username, works }: PublicWorksTabProps) {
  if (!works.length) {
    return (
      <EmptyState
        description="Người dùng này chưa đăng truyện công khai."
        title="Chưa có tác phẩm"
      />
    );
  }

  const hasMore = page * 20 < total;

  return (
    <div className="space-y-3">
      {works.map((work) => (
        <Card className="p-3" key={work.id}>
          <div className="flex gap-3">
            <StoryImageThumb
              className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-white/8 bg-white/5"
              story={work}
              usage="searchResult"
            />
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-1 text-sm font-bold text-white">{work.title}</h3>
              {work.description ? (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
                  {work.description}
                </p>
              ) : null}
              <p className="mt-1 text-[0.65rem] text-zinc-500">
                {work.chapterCount} chương · {work.statusLabel}
              </p>
              <Link className="mt-2 inline-block" href={`/stories/${work.slug}`}>
                <Button className="min-h-8 px-3 text-xs" type="button" variant="primary">
                  Đọc ngay
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ))}
      {hasMore ? (
        <a
          className="block text-center text-sm font-semibold text-cyan-200"
          href={`/profile/${username}?tab=works&page=${page + 1}`}
        >
          Trang sau
        </a>
      ) : null}
    </div>
  );
}
