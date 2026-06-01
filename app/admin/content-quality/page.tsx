import Link from "next/link";
import { AdminContentQualityPage } from "@/components/admin/AdminContentQualityPage";
import { ErrorState } from "@/components/ui";
import { getContentQualityPageData } from "@/lib/admin/get-content-quality-queue";
import { requireModerationAccess } from "@/lib/auth/require-moderation-access";
import type { AdminContentQualityTab } from "@/types/admin";

export const dynamic = "force-dynamic";

const TABS = new Set<AdminContentQualityTab>([
  "pending_review",
  "waiting_author",
  "appealing",
  "at_risk",
  "restored",
  "permanently_hidden",
  "all"
]);

export default async function AdminContentQualityRoute({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const guard = await requireModerationAccess("/admin/content-quality");
  const params = await searchParams;
  const tabParam = params.tab ?? "pending_review";
  const tab: AdminContentQualityTab = TABS.has(tabParam as AdminContentQualityTab)
    ? (tabParam as AdminContentQualityTab)
    : "pending_review";

  if (!guard.ok) {
    return (
      <section className="mx-auto max-w-[1320px] space-y-6">
        <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />
      </section>
    );
  }

  const data = await getContentQualityPageData(tab);

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6">
      <header className="space-y-2 border-b border-white/10 pb-6">
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin"
        >
          ← Trung tâm quản trị
        </Link>
        <p className="mt-4 text-sm font-medium uppercase tracking-wide text-cyan-300">
          ChapMee Admin
        </p>
        <h1 className="text-3xl font-bold tracking-normal text-white">Chất lượng nội dung</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Theo dõi nội dung bị đánh giá thấp, yêu cầu tác giả chỉnh sửa và xử lý theo quy trình
          minh bạch.
        </p>
        <p className="text-xs text-zinc-500">
          ChapMee không xóa nội dung khỏi hệ thống. Nội dung vi phạm chất lượng có thể bị ẩn
          công khai hoặc tắt kiếm tiền theo chính sách.
        </p>
        <Link
          className="inline-block text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin/content-quality/rules"
        >
          Cấu hình rule chất lượng →
        </Link>
        <span className="text-zinc-600"> · </span>
        <Link
          className="inline-block text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin/content-taxonomy-quality"
        >
          Chất lượng phân loại & tag →
        </Link>
      </header>

      <AdminContentQualityPage activeTab={tab} data={data} />
    </div>
  );
}
