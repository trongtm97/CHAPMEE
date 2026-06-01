import Link from "next/link";
import { studioPath } from "@/lib/studio/constants";
import {
  commentsBtnPrimary,
  commentsBtnSecondary
} from "@/components/studio/comments/shared/styles";

type StudioCommentsEmptyStateProps = {
  basePath: string;
  hasActiveFilters: boolean;
  hasStories: boolean;
};

export function StudioCommentsEmptyState({
  basePath,
  hasActiveFilters,
  hasStories
}: StudioCommentsEmptyStateProps) {
  if (!hasStories) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-[#111820]/60 px-6 py-12 text-center">
        <p className="text-lg font-semibold text-white">Chưa có truyện để nhận bình luận</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
          Tạo truyện và xuất bản chương để độc giả có thể bình luận.
        </p>
        <Link className={`${commentsBtnPrimary} mt-6 inline-flex`} href={studioPath("/stories")}>
          Tạo truyện
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-[#111820]/60 px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
        💬
      </div>
      <p className="mt-4 text-lg font-semibold text-white">Chưa có bình luận phù hợp</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
        {hasActiveFilters
          ? "Không có bình luận khớp bộ lọc hiện tại. Thử đổi tab, thời gian hoặc từ khóa tìm kiếm."
          : "Khi độc giả bình luận trên truyện hoặc chương của bạn, họ sẽ xuất hiện tại đây."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {hasActiveFilters ? (
          <Link className={commentsBtnPrimary} href={basePath}>
            Xóa bộ lọc
          </Link>
        ) : null}
        <Link className={commentsBtnSecondary} href={studioPath("/stories")}>
          Xem truyện của tôi
        </Link>
        <Link className={commentsBtnSecondary} href={studioPath("/reels")}>
          Tạo Reels kéo độc giả
        </Link>
      </div>
    </div>
  );
}
