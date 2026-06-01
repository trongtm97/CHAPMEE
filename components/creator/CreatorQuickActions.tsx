import Link from "next/link";
import { Card } from "@/components/ui";
import { STUDIO_BASE_PATH, studioPath } from "@/lib/studio/constants";

type CreatorQuickActionsProps = {
  basePath?: string;
  qualityNeedsActionCount?: number;
  writeChapterHref?: string;
  writeActionLabel?: string;
  defaultStorySlug?: string | null;
};

type QuickAction = {
  label: string;
  description: string;
  href?: string;
  disabled?: boolean;
  badge?: string;
};

export function CreatorQuickActions({
  basePath = STUDIO_BASE_PATH,
  defaultStorySlug = null,
  qualityNeedsActionCount = 0,
  writeActionLabel = "Viết chương mới",
  writeChapterHref = `${basePath}/stories`
}: CreatorQuickActionsProps) {
  const reelsHref = studioPath("/reels/new");

  const actions: QuickAction[] = [
    {
      description: "Khởi tạo truyện mới với tiêu đề và mô tả.",
      href: studioPath("/stories/new"),
      label: "Tạo truyện"
    },
    {
      description: writeActionLabel.includes("nội dung")
        ? "Tiếp tục soạn nội dung truyện một phần."
        : "Tiếp tục soạn chương cho truyện hiện có.",
      href: writeChapterHref,
      label: writeActionLabel
    },
    {
      description: "Dán hoặc tải file .txt theo mẫu để tạo nhiều chương nháp.",
      href: studioPath("/import"),
      label: "Nhập hàng loạt"
    },
    {
      description: "Xem và quản lý chương đã hẹn giờ đăng.",
      href: `${basePath}#lich-dang`,
      label: "Quản lý lịch đăng"
    },
    {
      description: "Lượt đọc, lưu và bình luận theo truyện.",
      href: studioPath("/analytics"),
      label: "Xem thống kê"
    },
    {
      badge:
        qualityNeedsActionCount > 0 ? String(qualityNeedsActionCount) : undefined,
      description: "Cảnh báo chất lượng, lý do và gửi xét duyệt lại.",
      href: studioPath("/content-health"),
      label: "Chất lượng nội dung"
    },
    {
      description: "Tối ưu đoạn trích và ảnh nền khi sửa chương.",
      href: reelsHref,
      label: "Tạo Reels"
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {actions.map((action) => {
        const inner = (
          <Card
            className={`relative h-full space-y-1 p-3 transition sm:p-4 ${
              action.disabled
                ? "opacity-60"
                : "hover:border-cyan-300/40 hover:bg-zinc-800/80"
            }`}
          >
            {action.badge ? (
              <span className="absolute right-2 top-2 rounded-full bg-zinc-700 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-zinc-300">
                {action.badge}
              </span>
            ) : null}
            <p className="pr-14 text-sm font-semibold text-white">{action.label}</p>
            <p className="text-xs leading-relaxed text-zinc-500">
              {action.description}
            </p>
          </Card>
        );

        if (action.disabled || !action.href) {
          return (
            <div aria-disabled className="cursor-not-allowed" key={action.label}>
              {inner}
            </div>
          );
        }

        return (
          <Link href={action.href} key={action.label}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
