import Link from "next/link";
import { STUDIO_BASE_PATH, studioPath } from "@/lib/studio/constants";

type StudioToolGridProps = {
  basePath?: string;
  qualityNeedsActionCount?: number;
  writeChapterHref?: string;
  writeToolLabel?: string;
  defaultStorySlug?: string | null;
  compact?: boolean;
};

type ToolItem = {
  label: string;
  href: string;
  badge?: string;
};

function CompactToolLink({ tool }: { tool: ToolItem }) {
  return (
    <Link
      className="tap-highlight relative flex min-h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-center text-xs font-medium text-zinc-200 transition hover:border-cyan-300/40 hover:bg-white/[0.06] hover:text-white"
      href={tool.href}
    >
      {tool.badge ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-zinc-700 px-1 text-[0.55rem] font-bold text-zinc-200">
          {tool.badge}
        </span>
      ) : null}
      <span className="line-clamp-2 leading-tight">{tool.label}</span>
    </Link>
  );
}

export function StudioToolGrid({
  basePath = STUDIO_BASE_PATH,
  compact = false,
  defaultStorySlug = null,
  qualityNeedsActionCount = 0,
  writeChapterHref = `${basePath}/stories`,
  writeToolLabel = "Viết chương"
}: StudioToolGridProps) {
  const reelsHref = defaultStorySlug
    ? studioPath(`/stories/${defaultStorySlug}/episodes`)
    : studioPath("/reels/new");

  const tools: ToolItem[] = [
    { href: studioPath("/stories/new"), label: "Tạo truyện" },
    { href: writeChapterHref, label: writeToolLabel },
    { href: studioPath("/import"), label: "Nhập hàng loạt" },
    { href: studioPath("/calendar"), label: "Lịch đăng" },
    { href: studioPath("/templates"), label: "Mẫu nội dung" },
    { href: reelsHref, label: "Tạo Reels" },
    { href: studioPath("/analytics"), label: "Thống kê" },
    {
      badge: qualityNeedsActionCount > 0 ? String(qualityNeedsActionCount) : undefined,
      href: studioPath("/content-health"),
      label: "Chất lượng"
    },
    { href: studioPath("/help"), label: "Hỗ trợ" }
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
        {tools.map((tool) => (
          <CompactToolLink key={tool.label} tool={tool} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
      {tools.map((tool) => (
        <CompactToolLink key={tool.label} tool={tool} />
      ))}
    </div>
  );
}
