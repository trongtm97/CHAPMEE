"use client";

import {
  warnAdminSeoDescriptionLength,
  warnAdminSeoTitleLength
} from "@/lib/seo/seo-validation";

type SeoGooglePreviewProps = {
  url?: string | null;
  title?: string | null;
  description?: string | null;
};

export function SeoGooglePreview({ url, title, description }: SeoGooglePreviewProps) {
  const warnings = [
    ...warnAdminSeoTitleLength(title),
    ...warnAdminSeoDescriptionLength(description)
  ];

  const displayUrl = url?.trim() || "chapmee.vn › …";
  const displayTitle = title?.trim() || "Tiêu đề trang";
  const displayDescription =
    description?.trim() || "Mô tả meta sẽ hiển thị ở đây nếu bạn nhập meta description.";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-200">Google preview</h3>
      <div className="rounded-xl border border-white/10 bg-white p-4 text-left shadow-sm">
        <p className="truncate text-sm text-[#202124]">{displayUrl}</p>
        <p className="mt-1 line-clamp-1 text-xl text-[#1a0dab]">{displayTitle}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-[#4d5156]">
          {displayDescription}
        </p>
      </div>
      {warnings.length > 0 ? (
        <ul className="space-y-1 text-xs text-amber-200/90">
          {warnings.map((warning) => (
            <li key={warning}>⚠ {warning}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-emerald-300/90">✓ Title và description ổn cho SERP cơ bản.</p>
      )}
    </div>
  );
}
