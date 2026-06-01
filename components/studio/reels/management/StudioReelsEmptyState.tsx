import Link from "next/link";
import { studioPath } from "@/lib/studio/constants";
import {
  reelsBtnPrimary,
  reelsBtnSecondary
} from "@/components/studio/reels/management/shared/styles";

type StudioReelsEmptyStateProps = {
  onCreateClick: () => void;
};

export function StudioReelsEmptyState({ onCreateClick }: StudioReelsEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center sm:px-6">
      <p className="text-base font-semibold text-white">Bạn chưa có Reels nào</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
        Tạo Reels từ một chương nổi bật để kéo độc giả vào truyện.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:mx-auto sm:max-w-md sm:grid-cols-2">
        <button className={reelsBtnPrimary} onClick={onCreateClick} type="button">
          Tạo Reels mới
        </button>
        <Link className={reelsBtnSecondary} href={studioPath("/reels/new")}>
          Chọn chương để tạo Reels
        </Link>
      </div>
      <ul className="mx-auto mt-6 max-w-md space-y-1.5 text-left text-xs text-zinc-500">
        <li>• Dùng đoạn cao trào làm hook thu hút.</li>
        <li>• Gắn Reels với đúng chương để CTA dẫn chính xác.</li>
        <li>• Lên lịch đăng đều mỗi ngày để giữ nhịp.</li>
      </ul>
    </div>
  );
}
