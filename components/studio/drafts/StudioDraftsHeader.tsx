import Link from "next/link";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import {
  draftsBtnPrimary,
  draftsBtnSecondary
} from "@/components/studio/drafts/shared/styles";

type StudioDraftsHeaderProps = {
  basePath: string;
  staleCount: number;
  writeChapterHref: string;
};

export function StudioDraftsHeader({
  basePath,
  staleCount,
  writeChapterHref
}: StudioDraftsHeaderProps) {
  const staleHref = buildStudioManagerHref(basePath, {
    status: "stale",
    time: "older"
  });

  return (
    <div className="space-y-3">
      <nav aria-label="Breadcrumb" className="text-xs text-zinc-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link className="transition hover:text-zinc-300" href={studioPath()}>
              Studio
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-zinc-400">Nháp</li>
        </ol>
      </nav>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-black text-white sm:text-2xl">Nháp</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
            Tiếp tục các truyện, chương, Reels và nội dung SEO bạn đang viết dở.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Link className={draftsBtnSecondary} href={writeChapterHref}>
            Viết chương mới
          </Link>
          <Link className={draftsBtnSecondary} href={studioPath("/stories/new")}>
            Tạo truyện
          </Link>
          <Link className={draftsBtnSecondary} href={studioPath("/reels/new")}>
            Tạo Reels
          </Link>
          {staleCount > 0 ? (
            <Link className={draftsBtnPrimary} href={staleHref}>
              Quản lý nháp cũ
            </Link>
          ) : (
            <Link className={draftsBtnSecondary} href={staleHref}>
              Dọn nháp cũ
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
