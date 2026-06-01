import { Card, ErrorState } from "@/components/ui";
import { UnmappedLegacyPanel } from "@/components/admin/taxonomy/UnmappedLegacyPanel";
import {
  findUnmappedLegacyTaxonomyValues,
  summarizeUnmappedLegacy
} from "@/lib/taxonomy/unmapped-legacy";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { TAXONOMY_PERMISSION_FALLBACK } from "@/lib/admin/taxonomy-permissions";

export const dynamic = "force-dynamic";

export default async function AdminTaxonomyUnmappedPage() {
  const guard = await requireAnyPermission(
    ["taxonomy.view", ...TAXONOMY_PERMISSION_FALLBACK.view, "admin.settings.update"],
    { returnTo: "/admin/taxonomy/unmapped" }
  );

  if (!guard.ok) {
    return (
      <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />
    );
  }

  const { rows, error } = await findUnmappedLegacyTaxonomyValues();
  const summary = summarizeUnmappedLegacy(rows);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">
          Taxonomy
        </p>
        <h1 className="mt-1 text-2xl font-black text-white">Giá trị legacy chưa map</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Báo cáo các giá trị phân loại cũ (genres, tags, age_rating) chưa liên kết với{" "}
          <code className="text-zinc-300">taxonomy_terms</code>. Không tự tạo term mới — admin xử
          thủ công hoặc cập nhật seed.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-zinc-400">Chưa resolve</p>
          <p className="text-2xl font-black text-amber-200">{summary.unresolved}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-zinc-400">Có gợi ý map</p>
          <p className="text-2xl font-black text-cyan-200">{summary.mapped}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-zinc-400">Story bị ảnh hưởng</p>
          <p className="text-2xl font-black text-white">{summary.totalStoriesAffected}</p>
        </Card>
      </div>

      {error ? (
        <ErrorState message={error} title="Không tải được báo cáo" variant="danger" />
      ) : (
        <UnmappedLegacyPanel rows={rows} />
      )}
    </div>
  );
}
