"use client";

import {
  AnnouncementAudienceBadge,
  AnnouncementPriorityBadge,
  AnnouncementTypeBadge,
  getAnnouncementAccentClass
} from "@/components/admin/announcements/AnnouncementBadges";
import type {
  AnnouncementAudienceType,
  AnnouncementVisibility,
  PlatformAnnouncement
} from "@/types/platform-content";

type PreviewProps = {
  title: string;
  excerpt: string;
  body: string;
  announcementType: PlatformAnnouncement["announcement_type"];
  priority: PlatformAnnouncement["priority"];
  audienceType: AnnouncementAudienceType;
  visibility: AnnouncementVisibility;
  indexable: boolean;
  seoTitle: string;
  seoDescription: string;
  mode: "admin" | "public" | "in_app";
  variant: "mobile" | "desktop";
};

export function AnnouncementPreview({
  title,
  excerpt,
  body,
  announcementType,
  priority,
  audienceType,
  visibility,
  indexable,
  seoTitle,
  seoDescription,
  mode,
  variant
}: PreviewProps) {
  const isMobile = variant === "mobile";
  const paragraphs = body.split("\n").map((line) => line.trim()).filter(Boolean);
  const accent = getAnnouncementAccentClass({
    priority,
    announcement_type: announcementType,
    status: "draft"
  });

  const displayTitle = title || "Tiêu đề thông báo";
  const snippetTitle = seoTitle.trim() || displayTitle;
  const snippetDescription =
    seoDescription.trim() || excerpt.trim() || paragraphs[0] || "Mô tả SEO sẽ hiển thị ở đây.";

  return (
    <div className="space-y-3">
      <div
        className={`overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 ${
          isMobile ? "mx-auto max-w-[320px]" : "w-full"
        } ${accent}`}
      >
        <div className="border-b border-white/10 px-4 py-2 text-xs text-zinc-500">
          Preview {mode} · {isMobile ? "mobile" : "desktop"}
        </div>
        <div className={`space-y-3 p-4 ${isMobile ? "text-sm" : "p-6"}`}>
          <div className="flex flex-wrap gap-2">
            <AnnouncementTypeBadge type={announcementType} />
            <AnnouncementPriorityBadge priority={priority} />
            {mode === "admin" ? <AnnouncementAudienceBadge audience={audienceType} /> : null}
          </div>
          <h3 className={`font-semibold text-white ${isMobile ? "text-base" : "text-xl"}`}>
            {displayTitle}
          </h3>
          {excerpt.trim() ? <p className="text-sm text-zinc-400">{excerpt}</p> : null}
          <div className="space-y-2 text-zinc-300">
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
            ) : (
              <p className="text-zinc-500">Nội dung thông báo sẽ hiển thị ở đây.</p>
            )}
          </div>
          {mode === "in_app" ? (
            <p className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-100">
              Thẻ in-app — visibility: {visibility === "targeted" ? "In-app" : visibility}
            </p>
          ) : null}
        </div>
      </div>

      {indexable && mode !== "in_app" ? (
        <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">SEO snippet</p>
          <p className="mt-2 text-sm text-cyan-300">{snippetTitle}</p>
          <p className="text-xs text-emerald-400">chapmee.vn › thong-bao › …</p>
          <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{snippetDescription}</p>
        </div>
      ) : null}
    </div>
  );
}
