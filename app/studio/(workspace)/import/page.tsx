import Link from "next/link";
import { redirect } from "next/navigation";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getCreatorStoriesForSwipe } from "@/lib/swipe/get-swipe-form-data";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { studioPath } from "@/lib/studio/constants";

type StudioImportPageProps = {
  searchParams: Promise<{ storyId?: string }>;
};

export const dynamic = "force-dynamic";

export default async function StudioImportPage({ searchParams }: StudioImportPageProps) {
  const { storyId } = await searchParams;
  const basePath = studioPath("/import");

  if (storyId) {
    redirect(studioPath(`/stories/${storyId}/import`));
  }

  const { creatorProfile, error } = await getStudioAccess(basePath);

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Nhập hàng loạt" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const { stories, error: storiesError } = await getCreatorStoriesForSwipe(creatorProfile);

  return (
    <section className="space-y-6">
      <SectionHeader
        subtitle="Chọn truyện để nhập nhiều chương nháp theo template mẫu."
        title="Nhập hàng loạt"
      />

      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
        Nội dung nhập hàng loạt sẽ được lưu thành nháp. Bạn cần kiểm tra lại trước khi đăng.
      </div>

      {storiesError ? (
        <ErrorState message={storiesError} title="Không tải được danh sách truyện" />
      ) : null}

      {stories.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Bạn chưa có truyện nào.{" "}
          <Link className="text-cyan-300" href={studioPath("/stories/new")}>
            Tạo truyện mới
          </Link>{" "}
          trước khi nhập hàng loạt.
        </p>
      ) : (
        <ul className="space-y-2">
          {stories.map((story) => (
            <li key={story.id}>
              <Link
                className="flex min-h-12 items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-cyan-300/40"
                href={studioPath(`/stories/${story.id}/import`)}
              >
                <span>{story.title}</span>
                <span className="text-cyan-300">Nhập chương →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
