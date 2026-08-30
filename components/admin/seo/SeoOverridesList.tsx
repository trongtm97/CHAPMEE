import Link from "next/link";
import type { SeoOverrideRow } from "@/lib/db/schema/seo-center";

type SeoOverridesListProps = {
  items: SeoOverrideRow[];
};

function formatRobots(row: SeoOverrideRow) {
  const index =
    row.robotsIndex === null ? "—" : row.robotsIndex ? "index" : "noindex";
  const follow =
    row.robotsFollow === null ? "—" : row.robotsFollow ? "follow" : "nofollow";
  return `${index}, ${follow}`;
}

function formatTarget(row: SeoOverrideRow) {
  if (row.path) {
    return row.path;
  }
  if (row.targetId) {
    return row.targetId.slice(0, 8) + "…";
  }
  return "—";
}

function shortText(value: string | null, max = 72) {
  if (!value?.trim()) {
    return "—";
  }
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

export function SeoOverridesList({ items }: SeoOverridesListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
        Chưa có override nào.{" "}
        <Link className="text-cyan-300 hover:text-cyan-200" href="/admin/seo/overrides/new">
          Tạo override đầu tiên
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3 font-semibold">Target type</th>
            <th className="px-4 py-3 font-semibold">Path / target_id</th>
            <th className="px-4 py-3 font-semibold">Title</th>
            <th className="px-4 py-3 font-semibold">Description</th>
            <th className="px-4 py-3 font-semibold">Robots</th>
            <th className="px-4 py-3 font-semibold">Enabled</th>
            <th className="px-4 py-3 font-semibold">Updated</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr className="border-b border-white/[0.04] text-zinc-300" key={row.id}>
              <td className="px-4 py-3 font-mono text-xs">{row.targetType}</td>
              <td className="max-w-[160px] truncate px-4 py-3 font-mono text-xs">
                {formatTarget(row)}
              </td>
              <td className="max-w-[180px] truncate px-4 py-3">{shortText(row.title, 48)}</td>
              <td className="max-w-[200px] truncate px-4 py-3 text-zinc-400">
                {shortText(row.metaDescription)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-zinc-500">{formatRobots(row)}</td>
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
              <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                {formatDate(row.updatedAt)}
              </td>
              <td className="px-4 py-3">
                <Link
                  className="font-semibold text-cyan-300 hover:text-cyan-200"
                  href={`/admin/seo/overrides/${row.id}`}
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
