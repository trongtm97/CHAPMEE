import Link from "next/link";
import type { CodeSnippetRow } from "@/lib/db/schema/code-snippets";
import { SNIPPET_STATUS_LABELS, SNIPPET_TYPE_LABELS } from "@/lib/snippets/constants";

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-200",
    inactive: "bg-zinc-500/15 text-zinc-300",
    draft: "bg-amber-500/15 text-amber-200",
    error: "bg-rose-500/15 text-rose-200"
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${colors[status] ?? colors.draft}`}
    >
      {SNIPPET_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatRoutes(row: CodeSnippetRow) {
  const placement = row.placementConfig as { mode?: string; pageGroup?: string };
  const routes = Array.isArray(row.routePatterns)
    ? (row.routePatterns as string[]).filter(Boolean)
    : [];
  if (placement?.mode === "global") return "Toàn site";
  if (placement?.mode === "page_group") return `Nhóm: ${placement.pageGroup ?? "—"}`;
  if (routes.length) return routes.slice(0, 2).join(", ") + (routes.length > 2 ? "…" : "");
  return placement?.mode ?? "—";
}

type SnippetsListTableProps = {
  items: CodeSnippetRow[];
  canEdit: boolean;
};

export function SnippetsListTable({ items, canEdit }: SnippetsListTableProps) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-zinc-500">
        Chưa có snippet. Tạo CSS, script hoặc HTML an toàn cho trang công khai.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3">Tên</th>
            <th className="px-4 py-3">Loại</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3">Ưu tiên</th>
            <th className="px-4 py-3">Vị trí / route</th>
            <th className="px-4 py-3">Cập nhật</th>
            <th className="px-4 py-3">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {items.map((row) => (
            <tr className="text-zinc-300" key={row.id}>
              <td className="px-4 py-3 font-medium text-zinc-100">{row.name}</td>
              <td className="px-4 py-3">
                {SNIPPET_TYPE_LABELS[row.type as keyof typeof SNIPPET_TYPE_LABELS] ?? row.type}
              </td>
              <td className="px-4 py-3">{statusBadge(row.status)}</td>
              <td className="px-4 py-3 tabular-nums">{row.priority}</td>
              <td className="max-w-[200px] truncate px-4 py-3 text-zinc-400" title={formatRoutes(row)}>
                {formatRoutes(row)}
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500">
                {row.updatedAt
                  ? new Date(row.updatedAt).toLocaleString("vi-VN")
                  : "—"}
              </td>
              <td className="px-4 py-3">
                {canEdit ? (
                  <Link
                    className="font-semibold text-cyan-300 hover:text-cyan-200"
                    href={`/admin/developer/snippets/${row.id}`}
                  >
                    Sửa
                  </Link>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
