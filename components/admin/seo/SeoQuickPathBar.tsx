"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { normalizeSeoPath } from "@/lib/seo/seo-validation";

type SeoQuickPathBarProps = {
  className?: string;
};

export function SeoQuickPathBar({ className = "" }: SeoQuickPathBarProps) {
  const router = useRouter();
  const [path, setPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeSeoPath(path.trim());
    if (!normalized) {
      setError("Nhập path hợp lệ, ví dụ /truyen hoặc /the-loai/ngon-tinh");
      return;
    }
    setError(null);
    startTransition(() => {
      router.push(`/admin/seo/edit?path=${encodeURIComponent(normalized)}`);
    });
  }

  return (
    <form
      className={`flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 sm:flex-row sm:items-center ${className}`.trim()}
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="seo-quick-path">
        URL cần chỉnh SEO
      </label>
      <input
        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
        disabled={pending}
        id="seo-quick-path"
        onChange={(event) => setPath(event.target.value)}
        placeholder="Dán path bất kỳ: /, /truyen, /the-loai/..."
        value={path}
      />
      <button
        className="shrink-0 rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Đang mở…" : "Chỉnh SEO"}
      </button>
      {error ? <p className="text-xs text-red-300 sm:basis-full">{error}</p> : null}
    </form>
  );
}
