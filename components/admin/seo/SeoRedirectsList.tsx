import Link from "next/link";
import type { SeoRedirectRow } from "@/lib/db/schema/seo-center";

type SeoRedirectsListProps = {
  items: SeoRedirectRow[];
};

function formatDate(value: Date | string | null) {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export function SeoRedirectsList({ items }: SeoRedirectsListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
        Chưa có redirect.{" "}
        <Link className="text-cyan-300 hover:text-cyan-200" href="/admin/seo/redirects/new">
          Tạo redirect
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3 font-semibold">Source</th>
            <th className="px-4 py-3 font-semibold">Destination</th>
            <th className="px-4 py-3 font-semibold">Code</th>
            <th className="px-4 py-3 font-semibold">Query</th>
            <th className="px-4 py-3 font-semibold">Enabled</th>
            <th className="px-4 py-3 font-semibold">Hits</th>
            <th className="px-4 py-3 font-semibold">Last hit</th>
            <th className="px-4 py-3 font-semibold">Updated</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr className="border-b border-white/[0.04] text-zinc-300" key={row.id}>
              <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs">
                {row.sourcePath}
              </td>
              <td className="max-w-[160px] truncate px-4 py-3 font-mono text-xs">
                {row.destinationPath}
              </td>
              <td className="px-4 py-3">{row.statusCode}</td>
              <td className="px-4 py-3">{row.preserveQuery ? "Yes" : "No"}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    row.isEnabled
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {row.isEnabled ? "Yes" : "No"}
                </span>
              </td>
              <td className="px-4 py-3">{row.hitCount}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                {formatDate(row.lastHitAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                {formatDate(row.updatedAt)}
              </td>
              <td className="px-4 py-3">
                <Link
                  className="font-semibold text-cyan-300 hover:text-cyan-200"
                  href={`/admin/seo/redirects/${row.id}`}
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
