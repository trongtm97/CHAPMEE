"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui";
import { SEO_DEFAULT_LOCALE, SEO_TARGET_TYPES } from "@/lib/seo/seo-constants";

export function SeoOverridesFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const targetType = searchParams.get("targetType") ?? "";
  const enabled = searchParams.get("enabled") ?? "";
  const locale = searchParams.get("locale") ?? "";
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
    router.push(`/admin/seo/overrides?${params.toString()}`);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
            enabled === "" ? "bg-cyan-300 text-zinc-950" : "border border-white/10 text-zinc-300"
          }`}
          onClick={() => pushUpdates({ enabled: "" })}
          type="button"
        >
          Tất cả
        </button>
        <button
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
            enabled === "1" ? "bg-emerald-400/20 text-emerald-200" : "border border-white/10 text-zinc-300"
          }`}
          onClick={() => pushUpdates({ enabled: "1" })}
          type="button"
        >
          Enabled
        </button>
        <button
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
            enabled === "0" ? "bg-zinc-700 text-zinc-200" : "border border-white/10 text-zinc-300"
          }`}
          onClick={() => pushUpdates({ enabled: "0" })}
          type="button"
        >
          Disabled
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-400">Target type</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) => pushUpdates({ targetType: event.target.value })}
            value={targetType}
          >
            <option value="">Tất cả</option>
            {SEO_TARGET_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-400">Locale</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) => pushUpdates({ locale: event.target.value })}
            value={locale}
          >
            <option value="">Tất cả</option>
            <option value={SEO_DEFAULT_LOCALE}>{SEO_DEFAULT_LOCALE}</option>
          </select>
        </label>

        <Input
          label="Tìm path / title"
          onChange={(event) => pushUpdates({ q: event.target.value })}
          placeholder="/discover hoặc tiêu đề"
          value={q}
        />
      </div>
    </div>
  );
}
