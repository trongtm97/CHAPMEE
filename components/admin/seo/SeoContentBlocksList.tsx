import Link from "next/link";
import type { SeoContentBlockRow } from "@/lib/db/schema/seo-center";

type SeoContentBlocksListProps = {
  items: SeoContentBlockRow[];
  canUpdate: boolean;
};

function formatDate(value: Date | string | null) {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function shortText(value: string | null, max = 64) {
  if (!value?.trim()) {
    return "—";
  }
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

export function SeoContentBlocksList({ items, canUpdate }: SeoContentBlocksListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
        Chưa có SEO content block.{" "}
        {canUpdate ? (
          <Link className="text-cyan-300 hover:text-cyan-200" href="/admin/seo/content-blocks/new">
            Tạo block đầu tiên
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3 font-semibold">Page type</th>
            <th className="px-4 py-3 font-semibold">Route</th>
            <th className="px-4 py-3 font-semibold">Title</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Updated</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr className="border-b border-white/[0.04] text-zinc-300" key={row.id}>
              <td className="px-4 py-3 font-mono text-xs">{row.pageType}</td>
              <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs">
                {row.routePath ?? "—"}
              </td>
              <td className="max-w-[200px] truncate px-4 py-3">{shortText(row.title, 48)}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    row.status === "published"
                      ? "bg-emerald-400/15 text-emerald-200"
                      : row.status === "archived"
                        ? "bg-zinc-800 text-zinc-400"
                        : "bg-amber-400/15 text-amber-200"
                  }`}
                >
                  {row.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                {formatDate(row.updatedAt)}
              </td>
              <td className="px-4 py-3">
                <Link
                  className="font-semibold text-cyan-300 hover:text-cyan-200"
                  href={`/admin/seo/content-blocks/${row.id}`}
                >
                  Sửa
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
