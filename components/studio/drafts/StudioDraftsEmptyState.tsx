import Link from "next/link";
import { studioPath } from "@/lib/studio/constants";
import {
  draftsBtnPrimary,
  draftsBtnSecondary
} from "@/components/studio/drafts/shared/styles";

export function StudioDraftsEmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center sm:px-6">
      <p className="text-base font-semibold text-white">Chưa có nháp nào</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
        Khi bạn viết truyện, chương, Reels hoặc SEO, bản nháp tự lưu sẽ xuất hiện ở
        đây.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:mx-auto sm:max-w-lg sm:grid-cols-3">
        <Link className={draftsBtnPrimary} href={studioPath("/stories")}>
          Viết chương mới
        </Link>
        <Link className={draftsBtnSecondary} href={studioPath("/stories/new")}>
          Tạo truyện mới
        </Link>
        <Link className={draftsBtnSecondary} href={studioPath("/reels/new")}>
          Tạo Reels
        </Link>
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        ChapMee sẽ tự lưu khi bạn đang soạn nội dung.
      </p>
    </div>
  );
}
