import Link from "next/link";
import {
  tplBtnPrimary,
  tplBtnSecondary,
  tplCard
} from "@/components/studio/templates/shared/styles";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import type { StudioTemplateTab } from "@/types/templates";

type TemplateEmptyStateProps = {
  activeTab: StudioTemplateTab;
  hasFilters: boolean;
  onCreate: () => void;
};

export function TemplateEmptyState({
  activeTab,
  hasFilters,
  onCreate
}: TemplateEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className={`${tplCard} border-dashed px-6 py-10 text-center`}>
        <p className="font-semibold text-white">Không có mẫu phù hợp</p>
        <p className="mt-2 text-sm text-zinc-400">Thử đổi từ khóa hoặc bộ lọc.</p>
        <Link className={`${tplBtnPrimary} mt-4 inline-flex`} href={studioPath("/templates")}>
          Xóa bộ lọc
        </Link>
      </div>
    );
  }

  if (activeTab === "mine") {
    return (
      <div className={`${tplCard} border-dashed px-6 py-10 text-center`}>
        <p className="text-lg font-semibold text-white">Bạn chưa có mẫu riêng</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
          Tạo mẫu cho hook Reels, mở đầu chương, ghi chú tác giả hoặc mô tả truyện để dùng lại
          nhanh.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button className={tplBtnPrimary} onClick={onCreate} type="button">
            Tạo mẫu đầu tiên
          </button>
          <Link
            className={tplBtnSecondary}
            href={buildStudioManagerHref(studioPath("/templates"), {})}
          >
            Nhân bản mẫu ChapMee
          </Link>
        </div>
      </div>
    );
  }

  if (activeTab === "favorites") {
    return (
      <div className={`${tplCard} border-dashed px-6 py-10 text-center`}>
        <p className="font-semibold text-white">Chưa có mẫu yêu thích</p>
        <p className="mt-2 text-sm text-zinc-400">Bấm ☆ trên card mẫu để lưu vào đây.</p>
      </div>
    );
  }

  if (activeTab === "recent") {
    return (
      <div className={`${tplCard} border-dashed px-6 py-10 text-center`}>
        <p className="font-semibold text-white">Chưa có mẫu gần đây</p>
        <p className="mt-2 text-sm text-zinc-400">
          Mẫu bạn xem hoặc dùng sẽ xuất hiện tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className={`${tplCard} border-dashed px-6 py-10 text-center`}>
      <p className="font-semibold text-white">Chưa có mẫu hệ thống</p>
      <p className="mt-2 text-sm text-zinc-400">Liên hệ đội kỹ thuật nếu migration chưa chạy.</p>
    </div>
  );
}
