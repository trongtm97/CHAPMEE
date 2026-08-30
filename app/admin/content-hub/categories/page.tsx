import Link from "next/link";

import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { listContentPostCategories } from "@/lib/platform-content/content-post-categories";

export const dynamic = "force-dynamic";

export default async function AdminContentPostCategoriesRoute() {
  const guard = await requireAnyPermission(
    ["content.post.view", "content.post.update", "admin.dashboard.view"],
    { returnTo: "/admin/content-hub/categories" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const { items, error } = await listContentPostCategories({ includeHidden: true });

  if (error) {
    return <ErrorState message={error} title="Không thể tải danh mục bài viết" variant="danger" />;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-white">Danh mục bài viết</h1>
        <Link
          className="ml-auto rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
          href="/admin/content-hub/categories/new"
        >
          + Tạo chuyên mục
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/60 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">SEO</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-zinc-950/30">
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-400" colSpan={5}>
                  Chưa có chuyên mục nào.
                </td>
              </tr>
            ) : (
              items.map((cat) => (
                <tr key={cat.id}>
                  <td className="px-4 py-3 font-medium text-zinc-100">{cat.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{cat.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        cat.status === "active"
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                          : "border-white/10 bg-white/[0.04] text-zinc-300"
                      }`}
                    >
                      {cat.status === "active" ? "Đang hiển thị" : "Đang ẩn"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {cat.indexable ? "index" : "noindex"}
                    {cat.seo_title?.trim() ? "" : " · thiếu title"}
                    {cat.seo_description?.trim() ? "" : " · thiếu desc"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    <Link className="text-cyan-200 hover:text-cyan-100" href={`/admin/content-hub/categories/${cat.id}`}>
                      Sửa
                    </Link>
                    <span className="px-2 text-zinc-700">|</span>
                    <a className="text-zinc-300 hover:text-white" href={`/bai-viet/danh-muc/${cat.slug}`} rel="noreferrer" target="_blank">
                      Xem ↗
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

