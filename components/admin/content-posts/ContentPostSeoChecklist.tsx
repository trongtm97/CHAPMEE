"use client";

import {
  getContentPostSeoIssues,
  getContentPostSeoScore,
  type ContentPostSeoCheckInput
} from "@/lib/content-posts/seo-validation";

type Props = ContentPostSeoCheckInput;

const ISSUE_LABELS: Record<string, string> = {
  missing_seo_title: "Thiếu SEO title",
  missing_seo_description: "Thiếu meta description",
  seo_title_length: "Độ dài SEO title chưa tối ưu",
  seo_description_length: "Độ dài meta description chưa tối ưu",
  invalid_slug: "Slug không hợp lệ",
  missing_excerpt: "Thiếu excerpt",
  missing_cover: "Thiếu ảnh bìa",
  content_has_h1: "Nội dung chứa H1",
  missing_h2_long_content: "Bài dài nên có H2",
  invalid_canonical: "Canonical không hợp lệ",
  index_without_seo: "Bật index nhưng thiếu SEO"
};

export function ContentPostSeoChecklist(props: Props) {
  const issues = getContentPostSeoIssues(props);
  const score = getContentPostSeoScore(props);

  const checks = [
    { ok: props.title.trim().length > 0, label: "Có tiêu đề" },
    { ok: !issues.includes("invalid_slug"), label: "Slug hợp lệ" },
    { ok: props.excerpt.trim().length > 0, label: "Có excerpt" },
    {
      ok: !props.indexable || (props.seoTitle.trim().length > 0 && props.seoDescription.trim().length > 0),
      label: "SEO title/description nếu index"
    },
    { ok: !issues.includes("content_has_h1"), label: "Không có H1 trong content" },
    {
      ok: !props.canonicalUrl.trim() || props.canonicalUrl.startsWith("/"),
      label: "Canonical nội bộ hợp lệ"
    }
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">SEO checklist</h3>
        <span className="text-sm font-bold text-cyan-300">{score}/100</span>
      </div>
      <ul className="space-y-1.5 text-xs">
        {checks.map((check) => (
          <li className={check.ok ? "text-emerald-300" : "text-amber-200"} key={check.label}>
            {check.ok ? "✓" : "○"} {check.label}
          </li>
        ))}
      </ul>
      {issues.length > 0 ? (
        <ul className="space-y-1 border-t border-white/5 pt-2 text-xs text-amber-200">
          {issues.map((issue) => (
            <li key={issue}>! {ISSUE_LABELS[issue] ?? issue}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
