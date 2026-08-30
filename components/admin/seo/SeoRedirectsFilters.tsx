"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui";
import { SEO_REDIRECT_STATUS_CODES } from "@/lib/seo/seo-constants";

export function SeoRedirectsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const enabled = searchParams.get("enabled") ?? "";
  const statusCode = searchParams.get("statusCode") ?? "";
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
    router.push(`/admin/seo/redirects?${params.toString()}`);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap gap-2">
        {[
          { value: "", label: "Tất cả" },
          { value: "1", label: "Enabled" },
          { value: "0", label: "Disabled" }
        ].map((tab) => (
          <button
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              enabled === tab.value
                ? "bg-cyan-300 text-zinc-950"
                : "border border-white/10 text-zinc-300"
            }`}
            key={tab.value || "all"}
            onClick={() => pushUpdates({ enabled: tab.value })}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-400">Status code</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) => pushUpdates({ statusCode: event.target.value })}
            value={statusCode}
          >
            <option value="">Tất cả</option>
            {SEO_REDIRECT_STATUS_CODES.map((code) => (
              <option key={code} value={String(code)}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Tìm path"
          onChange={(event) => pushUpdates({ q: event.target.value })}
          placeholder="/old-test"
          value={q}
        />
      </div>
    </div>
  );
}
