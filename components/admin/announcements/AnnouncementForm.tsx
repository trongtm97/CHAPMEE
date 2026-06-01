"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AnnouncementPreview } from "@/components/admin/announcements/AnnouncementPreview";
import { ConfirmActionModal } from "@/components/admin/campaigns/ConfirmActionModal";
import { ANNOUNCEMENT_AUDIENCE_LABELS, ANNOUNCEMENT_VISIBILITY_UI } from "@/lib/announcements/labels";
import {
  saveAdminAnnouncementAction,
  suggestAnnouncementSlugAction
} from "@/lib/admin/announcement-actions";
import { slugifyVietnameseTitle, validateContentPostSlug } from "@/lib/platform-content/slug";
import type { AdminAnnouncementCapabilities } from "@/types/admin-announcements";
import type { PlatformAnnouncement } from "@/types/platform-content";

type Props = {
  mode: "create" | "edit";
  announcement?: PlatformAnnouncement | null;
  capabilities: AdminAnnouncementCapabilities;
};

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500";

export function AnnouncementForm({ mode, announcement, capabilities }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [slugManual, setSlugManual] = useState(Boolean(announcement?.slug));
  const [confirmCriticalOpen, setConfirmCriticalOpen] = useState(false);
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [slug, setSlug] = useState(announcement?.slug ?? "");
  const [excerpt, setExcerpt] = useState(announcement?.excerpt ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [announcementType, setAnnouncementType] = useState(
    announcement?.announcement_type ?? "general"
  );
  const [visibility, setVisibility] = useState(announcement?.visibility ?? "public");
  const [status, setStatus] = useState(announcement?.status ?? "draft");
  const [priority, setPriority] = useState(announcement?.priority ?? "normal");
  const [audienceType, setAudienceType] = useState(announcement?.audience_type ?? "all");
  const [scheduledAt, setScheduledAt] = useState(toLocalInputValue(announcement?.scheduled_at));
  const [expiresAt, setExpiresAt] = useState(toLocalInputValue(announcement?.expires_at));
  const [indexable, setIndexable] = useState(announcement?.indexable ?? false);
  const [followLinks, setFollowLinks] = useState(announcement?.follow_links ?? true);
  const [seoTitle, setSeoTitle] = useState(announcement?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(announcement?.seo_description ?? "");
  const [canonicalPath, setCanonicalPath] = useState(
    announcement?.canonical_path ?? (announcement?.slug ? `/thong-bao/${announcement.slug}` : "")
  );
  const [ogTitle, setOgTitle] = useState(announcement?.og_title ?? "");
  const [ogDescription, setOgDescription] = useState(announcement?.og_description ?? "");
  const [ogImageUrl, setOgImageUrl] = useState(announcement?.og_image_url ?? "");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"admin" | "public" | "in_app">("admin");

  useEffect(() => {
    if (slugManual || !title.trim()) return;

    const timer = window.setTimeout(async () => {
      const result = await suggestAnnouncementSlugAction(title, announcement?.id);
      if (result.slug) {
        setSlug(result.slug);
        if (!canonicalPath || canonicalPath.startsWith("/thong-bao/")) {
          setCanonicalPath(`/thong-bao/${result.slug}`);
        }
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [title, slugManual, announcement?.id, canonicalPath]);

  const seoWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (indexable && !seoTitle.trim()) warnings.push("Thiếu SEO title khi bật index.");
    if (indexable && !seoDescription.trim()) warnings.push("Thiếu meta description khi bật index.");
    if ((status === "published" || status === "scheduled") && !body.trim()) {
      warnings.push("Body bắt buộc khi đăng hoặc lên lịch.");
    }
    if (status === "scheduled" && !scheduledAt) {
      warnings.push("Scheduled at bắt buộc khi trạng thái Scheduled.");
    }
    return warnings;
  }, [indexable, seoTitle, seoDescription, status, body, scheduledAt]);

  function handleSlugChange(value: string) {
    setSlugManual(true);
    const normalized = slugifyVietnameseTitle(value.replace(/-/g, " "));
    setSlug(normalized);
    setSlugError(validateContentPostSlug(normalized));
    if (!canonicalPath || canonicalPath.startsWith("/thong-bao/")) {
      setCanonicalPath(normalized ? `/thong-bao/${normalized}` : "");
    }
  }

  function submit(confirmCritical = false) {
    const validation = validateContentPostSlug(slug);
    if (validation) {
      setSlugError(validation);
      return;
    }

    if (
      priority === "critical" &&
      !confirmCritical &&
      (status === "published" || status === "scheduled") &&
      visibility === "public"
    ) {
      setConfirmCriticalOpen(true);
      return;
    }

    startTransition(async () => {
      const result = await saveAdminAnnouncementAction({
        id: announcement?.id,
        title,
        slug,
        excerpt,
        body,
        announcement_type: announcementType,
        visibility,
        status,
        priority,
        audience_type: audienceType,
        scheduled_at: scheduledAt,
        expires_at: expiresAt,
        indexable,
        follow_links: followLinks,
        seo_title: seoTitle,
        seo_description: seoDescription,
        canonical_path: canonicalPath,
        og_title: ogTitle,
        og_description: ogDescription,
        og_image_url: ogImageUrl,
        auto_slug: !slugManual,
        confirm_critical: confirmCritical
      });

      setToast(result.message);
      if (!result.ok) return;

      if (mode === "create" && result.id) {
        router.push(`/admin/announcements/${result.id}`);
        router.refresh();
        return;
      }

      router.refresh();
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    submit(false);
  }

  const canSave = mode === "create" ? capabilities.canCreate : capabilities.canUpdate;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <form className="space-y-6" onSubmit={handleSubmit}>
        {toast ? (
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
            {toast}
          </div>
        ) : null}

        {seoWarnings.length > 0 ? (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
            {seoWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <h2 className="text-lg font-semibold text-white">Nội dung cơ bản</h2>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Tiêu đề *</span>
            <input
              className={inputClassName}
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Slug *</span>
            <input
              className={inputClassName}
              onChange={(event) => handleSlugChange(event.target.value)}
              required
              value={slug}
            />
            {slugError ? <p className="text-xs text-red-300">{slugError}</p> : null}
            <p className="text-xs text-zinc-500">
              Ví dụ: &quot;Thông báo bảo trì ChapMee&quot; → thong-bao-bao-tri-chapmee
            </p>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Mô tả ngắn (excerpt)</span>
            <textarea
              className={`${inputClassName} min-h-[80px]`}
              onChange={(event) => setExcerpt(event.target.value)}
              value={excerpt}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Nội dung body</span>
            <textarea
              className={`${inputClassName} min-h-[220px]`}
              onChange={(event) => setBody(event.target.value)}
              value={body}
            />
          </label>
        </section>

        <section
          className="grid gap-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5 sm:grid-cols-2"
          id="types-guide"
        >
          <h2 className="text-lg font-semibold text-white sm:col-span-2">Phân loại & trạng thái</h2>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Loại thông báo</span>
            <select
              className={inputClassName}
              onChange={(event) =>
                setAnnouncementType(event.target.value as PlatformAnnouncement["announcement_type"])
              }
              value={announcementType}
            >
              {[
                "general",
                "maintenance",
                "policy",
                "monetization",
                "creator",
                "reader",
                "feature",
                "warning"
              ].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Trạng thái</span>
            <select
              className={inputClassName}
              onChange={(event) =>
                setStatus(event.target.value as PlatformAnnouncement["status"])
              }
              value={status}
            >
              {["draft", "published", "scheduled", "hidden", "archived"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Mức ưu tiên</span>
            <select
              className={inputClassName}
              onChange={(event) =>
                setPriority(event.target.value as PlatformAnnouncement["priority"])
              }
              value={priority}
            >
              {["low", "normal", "high", "critical"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Đối tượng (audience)</span>
            <select
              className={inputClassName}
              onChange={(event) =>
                setAudienceType(event.target.value as PlatformAnnouncement["audience_type"])
              }
              value={audienceType}
            >
              {Object.entries(ANNOUNCEMENT_AUDIENCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-zinc-300">Hiển thị (visibility)</span>
            <select
              className={inputClassName}
              onChange={(event) =>
                setVisibility(event.target.value as PlatformAnnouncement["visibility"])
              }
              value={visibility}
            >
              {Object.entries(ANNOUNCEMENT_VISIBILITY_UI).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label} — {meta.description}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="grid gap-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5 sm:grid-cols-2">
          <h2 className="text-lg font-semibold text-white sm:col-span-2">Lên lịch</h2>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Thời gian đăng (schedule)</span>
            <input
              className={inputClassName}
              onChange={(event) => setScheduledAt(event.target.value)}
              type="datetime-local"
              value={scheduledAt}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Hết hạn / ẩn sau (tùy chọn)</span>
            <input
              className={inputClassName}
              onChange={(event) => setExpiresAt(event.target.value)}
              type="datetime-local"
              value={expiresAt}
            />
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <h2 className="text-lg font-semibold text-white">SEO & Index</h2>

          <label className="flex items-center gap-3">
            <input
              checked={indexable}
              className="h-4 w-4 rounded border-white/20 bg-zinc-950"
              onChange={(event) => setIndexable(event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm text-zinc-300">
              Cho phép Google index (mặc định noindex — phù hợp bảo trì/nội bộ)
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              checked={followLinks}
              className="h-4 w-4 rounded border-white/20 bg-zinc-950"
              onChange={(event) => setFollowLinks(event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm text-zinc-300">Robots follow links</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-sm font-medium text-zinc-300">SEO title</span>
              <input
                className={inputClassName}
                onChange={(event) => setSeoTitle(event.target.value)}
                value={seoTitle}
              />
            </label>

            <label className="block space-y-1 sm:col-span-2">
              <span className="text-sm font-medium text-zinc-300">Meta description</span>
              <textarea
                className={`${inputClassName} min-h-[80px]`}
                onChange={(event) => setSeoDescription(event.target.value)}
                value={seoDescription}
              />
            </label>

            <label className="block space-y-1 sm:col-span-2">
              <span className="text-sm font-medium text-zinc-300">Canonical path (nội bộ /...)</span>
              <input
                className={inputClassName}
                onChange={(event) => setCanonicalPath(event.target.value)}
                placeholder="/thong-bao/slug"
                value={canonicalPath}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-300">OG title</span>
              <input
                className={inputClassName}
                onChange={(event) => setOgTitle(event.target.value)}
                value={ogTitle}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-300">OG description</span>
              <input
                className={inputClassName}
                onChange={(event) => setOgDescription(event.target.value)}
                value={ogDescription}
              />
            </label>

            <label className="block space-y-1 sm:col-span-2">
              <span className="text-sm font-medium text-zinc-300">OG image URL</span>
              <input
                className={inputClassName}
                onChange={(event) => setOgImageUrl(event.target.value)}
                placeholder="https://..."
                value={ogImageUrl}
              />
            </label>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          {canSave ? (
            <button
              className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:opacity-60"
              disabled={pending}
              type="submit"
            >
              {pending ? "Đang lưu…" : mode === "create" ? "Tạo thông báo" : "Lưu thay đổi"}
            </button>
          ) : null}
          <Link
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5"
            href="/admin/announcements"
          >
            Quay lại
          </Link>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["admin", "public", "in_app"] as const).map((modeKey) => (
            <button
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                previewMode === modeKey
                  ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                  : "border-white/10 text-zinc-400"
              }`}
              key={modeKey}
              onClick={() => setPreviewMode(modeKey)}
              type="button"
            >
              {modeKey === "admin" ? "Admin" : modeKey === "public" ? "Public" : "In-app"}
            </button>
          ))}
        </div>

        <h2 className="text-lg font-semibold text-white">Preview</h2>
        <AnnouncementPreview
          announcementType={announcementType}
          audienceType={audienceType}
          body={body}
          excerpt={excerpt}
          indexable={indexable}
          mode={previewMode}
          priority={priority}
          seoDescription={seoDescription}
          seoTitle={seoTitle}
          title={title}
          variant="desktop"
          visibility={visibility}
        />
        <AnnouncementPreview
          announcementType={announcementType}
          audienceType={audienceType}
          body={body}
          excerpt={excerpt}
          indexable={indexable}
          mode={previewMode}
          priority={priority}
          seoDescription={seoDescription}
          seoTitle={seoTitle}
          title={title}
          variant="mobile"
          visibility={visibility}
        />
      </aside>

      <ConfirmActionModal
        confirmLabel="Xác nhận đăng"
        description="Thông báo Critical với hiển thị public sẽ được nhiều người thấy. Tiếp tục?"
        onClose={() => setConfirmCriticalOpen(false)}
        onConfirm={() => {
          setConfirmCriticalOpen(false);
          submit(true);
        }}
        open={confirmCriticalOpen}
        pending={pending}
        title="Xác nhận mức Critical"
        variant="primary"
      />
    </div>
  );
}

function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}
