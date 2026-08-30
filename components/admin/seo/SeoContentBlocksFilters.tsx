"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui";
import { SEO_CONTENT_STATUSES, SEO_PAGE_TYPES } from "@/lib/seo/seo-constants";

export function SeoContentBlocksFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pageType = searchParams.get("pageType") ?? "";
  const status = searchParams.get("status") ?? "";
  const q = searchParams.get("q") ?? "";

  function pushUpdates(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page");
    router.push(`/admin/seo/content-blocks?${params.toString()}`);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-400">Page type</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) => pushUpdates({ pageType: event.target.value })}
            value={pageType}
          >
            <option value="">Tất cả</option>
            {SEO_PAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-400">Status</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) => pushUpdates({ status: event.target.value })}
            value={status}
          >
            <option value="">Tất cả</option>
            {SEO_CONTENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <Input
          label="Tìm title / route_path"
          onChange={(event) => pushUpdates({ q: event.target.value })}
          placeholder="/truyen hoặc tiêu đề"
          value={q}
        />
      </div>
    </div>
  );
}
