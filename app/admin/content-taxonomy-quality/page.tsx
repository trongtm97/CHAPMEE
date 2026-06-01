import Link from "next/link";
import { AdminContentTaxonomyQualityPage } from "@/components/admin/AdminContentTaxonomyQualityPage";
import { ErrorState } from "@/components/ui";
import {
  getAdminStoryTaxonomyEditBundle,
  getContentTaxonomyQualityPageData
} from "@/lib/admin/get-content-taxonomy-quality-page-data";
import { requireContentTaxonomyQualityAccess } from "@/lib/auth/require-content-taxonomy-quality-access";
import type { TaxonomyQualityAdminTab } from "@/types/content-taxonomy-quality";

export const dynamic = "force-dynamic";

const TABS = new Set<TaxonomyQualityAdminTab>([
  "overview",
  "stories",
  "hot_tags",
  "missing_warnings",
  "import_errors",
  "revision_requests",
  "rules"
]);

export default async function AdminContentTaxonomyQualityRoute({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const guard = await requireContentTaxonomyQualityAccess(
    "/admin/content-taxonomy-quality"
  );
  const params = await searchParams;
  const tabParam = params.tab ?? "overview";
  const tab: TaxonomyQualityAdminTab = TABS.has(tabParam as TaxonomyQualityAdminTab)
    ? (tabParam as TaxonomyQualityAdminTab)
    : "overview";
  const page = Number(params.page ?? "1");
  const editStoryId = params.edit?.trim();
  const editFlagId = params.flag?.trim();

  if (!guard.ok) {
    return (
      <section className="mx-auto max-w-[1320px] space-y-6">
        <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />
      </section>
    );
  }

  const [data, editBundle] = await Promise.all([
    getContentTaxonomyQualityPageData({
      tab,
      page: Number.isFinite(page) ? page : 1,
      pageSize: 20,
      flagType: params.flag_type as never,
      severity: params.severity as never,
      status: params.status as never,
      author: params.author,
      mainGenre: params.main_genre,
      importJobId: params.import_job,
      hasUserReports: params.reports === "1"
    }),
    editStoryId ? getAdminStoryTaxonomyEditBundle(editStoryId) : Promise.resolve(null)
  ]);

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
        <h1 className="text-3xl font-bold tracking-normal text-white">
          Chất lượng phân loại nội dung
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">
          Phát hiện truyện thiếu tag, sai thể loại, lạm dụng tag hot và khai báo cảnh báo
          nội dung chưa đúng. Khác với Composer Publishing Check (cấu trúc block/chapter).
        </p>
        <Link
          className="inline-block text-sm text-zinc-500 hover:text-zinc-300"
          href="/admin/content-quality"
        >
          Chất lượng nội dung (low-quality lifecycle) →
        </Link>
        <span className="text-zinc-600"> · </span>
        <Link
          className="inline-block text-sm text-zinc-500 hover:text-zinc-300"
          href="/admin/taxonomy"
        >
          Quản lý taxonomy →
        </Link>
      </header>

      <AdminContentTaxonomyQualityPage
        activeTab={tab}
        data={data}
        editBundle={editBundle}
        editFlagId={editFlagId}
        filterInitial={{
          flagType: (params.flag_type as never) ?? "all",
          severity: (params.severity as never) ?? "all",
          status: (params.status as never) ?? "all",
          author: params.author,
          mainGenre: params.main_genre,
          importJob: params.import_job,
          hasUserReports: params.reports === "1"
        }}
      />
    </div>
  );
}
