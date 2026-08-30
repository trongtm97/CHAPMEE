import { ErrorState, SectionHeader } from "@/components/ui";
import { ImportExportTabs } from "@/components/studio/import/ImportExportTabs";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getImportExportPageData } from "@/lib/studio/import-export-server";
import { studioPath } from "@/lib/studio/constants";

export const dynamic = "force-dynamic";

export default async function StudioImportPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string; storyId?: string }>;
}) {
  const { tab, storyId: scopedStoryId } = await searchParams;
  const basePath = studioPath("/import");
  const { creatorProfile, error } = await getStudioAccess(basePath);

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Nhập / Xuất hàng loạt" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const pageData = await getImportExportPageData(creatorProfile);

  return (
    <section className="space-y-5 pb-24 sm:space-y-6 sm:pb-6">
      <SectionHeader
        subtitle="Nhập truyện / chương từ file CSV/XLSX, xuất dữ liệu hiện có để chỉnh sửa hàng loạt. Dùng tab riêng cho truyện và chương."
        title="Nhập / Xuất hàng loạt"
      />

      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
        Nội dung nhập hàng loạt sẽ được kiểm tra preview trước khi lưu. Thao tác xóa/ẩn cần xác nhận thêm.
      </div>

      <ImportExportTabs {...pageData} initialStoryId={scopedStoryId} initialTab={tab} />
    </section>
  );
}
