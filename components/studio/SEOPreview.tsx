"use client";

import { SITE_NAME } from "@/lib/seo/metadata";

type SEOPreviewProps = {
  description: string;
  title: string;
  url: string;
  variant: "google" | "social";
};

export function SEOPreview({ description, title, url, variant }: SEOPreviewProps) {
  const displayTitle = title.trim() || "Tiêu đề SEO";
  const displayDescription =
    description.trim() || "Mô tả lấy từ nội dung có sẵn";

  if (variant === "social") {
    return (
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1f2e]">
        <div className="aspect-[1.91/1] bg-gradient-to-br from-zinc-800 to-zinc-900" />
        <div className="space-y-1 p-3">
          <p className="text-[0.65rem] uppercase tracking-wide text-zinc-500">
            {SITE_NAME}
          </p>
          <p className="line-clamp-2 text-sm font-bold text-white">{displayTitle}</p>
          <p className="line-clamp-2 text-xs text-zinc-400">{displayDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white p-4 text-left shadow-sm">
      <p className="truncate text-xs text-[#202124]">{url || "chapmee.vn/truyen/..."}</p>
      <p className="mt-1 line-clamp-1 text-xl text-[#1a0dab]">{displayTitle}</p>
      <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#4d5156]">
        {displayDescription}
      </p>
    </div>
  );
}
