"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SNIPPET_TYPES } from "@/lib/snippets/types";

export function SnippetsListFilters() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const type = searchParams.get("type") ?? "";

  function hrefWith(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    return `/admin/developer/snippets?${params.toString()}`;
  }

  return (
    <form action="/admin/developer/snippets" className="flex flex-wrap gap-3 text-sm" method="get">
      <input
        className="min-w-[180px] flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-zinc-100"
        defaultValue={q}
        name="q"
        placeholder="Tìm tên, slug…"
        type="search"
      />
      <select
        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-zinc-100"
        defaultValue={status}
        name="status"
      >
        <option value="">Mọi trạng thái</option>
        <option value="active">Đang bật</option>
        <option value="inactive">Đang tắt</option>
        <option value="draft">Bản nháp</option>
        <option value="error">Lỗi</option>
      </select>
      <select
        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-zinc-100"
        defaultValue={type}
        name="type"
      >
        <option value="">Mọi loại</option>
        {SNIPPET_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button
        className="rounded-full bg-cyan-400/20 px-4 py-2 font-semibold text-cyan-100"
        type="submit"
      >
        Lọc
      </button>
      <Link className="self-center font-semibold text-zinc-500 hover:text-zinc-300" href={hrefWith({})}>
        Xoá lọc
      </Link>
    </form>
  );
}
