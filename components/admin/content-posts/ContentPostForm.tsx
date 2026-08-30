"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ContentPostCoverUploader, type ContentPostCoverValue } from "@/components/admin/content-posts/ContentPostCoverUploader";
import { getMediaAssetPreviewAction } from "@/lib/admin/seo-center-actions";
import { resolveStoredMediaUrl } from "@/lib/media/media-url";
import { ContentPostEditor } from "@/components/admin/content-posts/ContentPostEditor";
import { ContentPostPreview } from "@/components/admin/content-posts/ContentPostPreview";
import { ContentPostSeoChecklist } from "@/components/admin/content-posts/ContentPostSeoChecklist";
import {
  countHeadings,
  countInternalLinks,
  countWords,
  estimateReadingMinutes
} from "@/lib/content-posts/seo-validation";
import { saveAdminContentPostAction, suggestContentPostSlugAction } from "@/lib/admin/content-post-actions";
import {
  mergeTagsWithFeatured,
  parseFeaturedFromTags
} from "@/lib/content-posts/featured";
import { slugifyVietnameseTitle, validateContentPostSlug } from "@/lib/platform-content/slug";
import { getContentPostUrl } from "@/lib/urls/paths";
import type { AdminContentPostCapabilities } from "@/types/admin-content-posts";
import type { AdminContentPost, ContentPostCategory, ContentPostRobots } from "@/types/platform-content";

type Props = {
  mode: "create" | "edit";
  post?: AdminContentPost | null;
  capabilities: AdminContentPostCapabilities;
  categories?: ContentPostCategory[];
  initialCategoryIds?: string[];
};

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500";

export function ContentPostForm({
  mode,
  post,
  capabilities,
  categories = [],
  initialCategoryIds = []
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [slugManual, setSlugManual] = useState(Boolean(post?.slug));

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [cover, setCover] = useState<ContentPostCoverValue>({
    mediaAssetId: post?.cover_media_asset_id ?? null,
    previewUrl: resolveStoredMediaUrl(post?.cover_image_url) ?? null
  });
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds);
  const [tags, setTags] = useState(post?.tags.join(", ") ?? "");
  const [hubFeatured, setHubFeatured] = useState(() =>
    parseFeaturedFromTags(post?.tags.join(", ") ?? "")
  );
  const [postType, setPostType] = useState(post?.post_type ?? "article");
  const [status, setStatus] = useState(post?.status ?? "draft");
  const [publishedAt, setPublishedAt] = useState(toLocalInputValue(post?.published_at));
  const [scheduledAt, setScheduledAt] = useState(toLocalInputValue(post?.scheduled_at));
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(post?.seo_description ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(
    post?.canonical_url ?? (post?.slug ? `/bai-viet/${post.slug}` : "")
  );
  const [indexable, setIndexable] = useState(post?.indexable ?? true);
  const [robots, setRobots] = useState<ContentPostRobots>(post?.robots ?? "index,follow");
  const [ogTitle, setOgTitle] = useState(post?.og_title ?? "");
  const [ogDescription, setOgDescription] = useState(post?.og_description ?? "");
  const [slugError, setSlugError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const assetId = post?.cover_media_asset_id?.trim();
    if (!assetId) {
      return;
    }
    void getMediaAssetPreviewAction(assetId).then((result) => {
      if (result.url) {
        setCover((prev) =>
          prev.mediaAssetId === assetId ? { ...prev, previewUrl: result.url } : prev
        );
      }
    });
  }, [post?.cover_media_asset_id]);

  useEffect(() => {
    if (slugManual || !title.trim()) return;
    const timer = window.setTimeout(async () => {
      const result = await suggestContentPostSlugAction(title, post?.id);
      if (result.slug) {
        setSlug(result.slug);
        if (!canonicalUrl || canonicalUrl.startsWith("/bai-viet/")) {
          setCanonicalUrl(`/bai-viet/${result.slug}`);
        }
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [title, slugManual, post?.id, canonicalUrl]);

  const seoInput = useMemo(
    () => ({
      title,
      slug,
      excerpt,
      content,
      postType,
      coverImageUrl: cover.previewUrl ?? "",
      seoTitle,
      seoDescription,
      canonicalUrl,
      indexable
    }),
    [title, slug, excerpt, content, postType, cover.previewUrl, seoTitle, seoDescription, canonicalUrl, indexable]
  );

  const categorySlugById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of categories) {
      map.set(item.id, item.slug);
    }
    return map;
  }, [categories]);

  const legacyCategorySlug = useMemo(() => {
    const first = categoryIds[0];
    if (!first) return "";
    return categorySlugById.get(first) ?? "";
  }, [categoryIds, categorySlugById]);

  const wordCount = countWords(content);
  const readingMin = estimateReadingMinutes(content);
  const headings = countHeadings(content);
  const internalLinks = countInternalLinks(content);

  function handleSlugChange(value: string) {
    setSlugManual(true);
    const normalized = slugifyVietnameseTitle(value.replace(/-/g, " "));
    setSlug(normalized);
    setSlugError(validateContentPostSlug(normalized));
    if (!canonicalUrl || canonicalUrl.startsWith("/bai-viet/")) {
      setCanonicalUrl(normalized ? `/bai-viet/${normalized}` : "");
    }
  }

  function submit(nextStatus?: AdminContentPost["status"]) {
    const validation = validateContentPostSlug(slug);
    if (validation) {
      setSlugError(validation);
      return;
    }

    const finalStatus = nextStatus ?? status;

    startTransition(async () => {
      const result = await saveAdminContentPostAction({
        id: post?.id,
        title,
        slug,
        excerpt,
        content,
        cover_media_asset_id: cover.mediaAssetId ?? undefined,
        category: legacyCategorySlug,
        category_ids: categoryIds,
        tags: mergeTagsWithFeatured(tags, hubFeatured).join(", "),
        post_type: postType,
        status: finalStatus,
        published_at: publishedAt,
        scheduled_at: scheduledAt,
        seo_title: seoTitle,
        seo_description: seoDescription,
        canonical_url: canonicalUrl,
        indexable,
        robots,
        og_title: ogTitle,
        og_description: ogDescription,
        og_image_media_asset_id: cover.mediaAssetId ?? undefined,
        auto_slug: !slugManual
      });

      if (!result.ok) {
        setToast(result.message);
        return;
      }

      setStatus(finalStatus);
      setToast(statusToast(finalStatus, result.message));

      if (mode === "create" && result.id) {
        router.push(`/admin/content-hub/${result.id}`);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  const canSave = mode === "create" ? capabilities.canCreate : capabilities.canUpdate;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur">
        <Link className="text-sm text-zinc-400 hover:text-zinc-200" href="/admin/content-hub">
          ← Quay lại
        </Link>
        {post && status === "published" ? (
          <a
            className="rounded-xl border border-cyan-400/20 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-400/10"
            href={
              post.public_code
                ? getContentPostUrl({ slug: post.slug, public_code: post.public_code })
                : `/bai-viet/${post.slug}`
            }
            rel="noreferrer"
            target="_blank"
          >
            Xem bài viết thực tế ↗
          </a>
        ) : null}
        {mode === "edit" && post ? (
          <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300">
            {(post.view_count ?? 0).toLocaleString("vi-VN")} lượt xem
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
            onClick={() => {
              setShowPreview((v) => {
                const next = !v;
                if (next) {
                  window.setTimeout(() => {
                    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 50);
                }
                return next;
              });
            }}
            type="button"
          >
            {showPreview ? "Ẩn preview" : "Xem trước"}
          </button>
          {canSave ? (
            <>
              <button
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-60"
                disabled={pending}
                onClick={() => submit("draft")}
                type="button"
              >
                Lưu nháp
              </button>
              <button
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-60"
                disabled={pending}
                onClick={() => submit(status === "scheduled" ? "scheduled" : "published")}
                type="button"
              >
                {pending
                  ? "Đang lưu…"
                  : status === "scheduled"
                    ? "Lên lịch"
                    : status === "published"
                      ? "Cập nhật"
                      : "Đăng"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {toast ? (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
          {toast}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">Nội dung chính</h2>
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Tiêu đề *</span>
              <input className={inputClassName} onChange={(e) => setTitle(e.target.value)} required value={title} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Slug *</span>
              <input
                className={inputClassName}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                value={slug}
              />
              {slugError ? <p className="text-xs text-red-300">{slugError}</p> : null}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm text-zinc-300">Loại bài *</span>
                <select
                  className={inputClassName}
                  onChange={(e) => setPostType(e.target.value as AdminContentPost["post_type"])}
                  value={postType}
                >
                  {["article", "guide", "seo", "editorial", "policy", "news"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-1">
                <span className="text-sm text-zinc-300">Chuyên mục</span>
                <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-white/10 bg-zinc-950 px-3 py-2">
                  {categories.length === 0 ? (
                    <p className="text-xs text-zinc-500">Chưa có chuyên mục nào. Tạo trong Admin → Bài viết → Danh mục bài viết.</p>
                  ) : (
                    categories.map((cat) => {
                      const checked = categoryIds.includes(cat.id);
                      return (
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200" key={cat.id}>
                          <input
                            checked={checked}
                            className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400"
                            disabled={pending || !canSave}
                            onChange={(e) => {
                              setCategoryIds((prev) => {
                                if (e.target.checked) {
                                  return prev.includes(cat.id) ? prev : [...prev, cat.id];
                                }
                                return prev.filter((id) => id !== cat.id);
                              });
                            }}
                            type="checkbox"
                          />
                          <span className="min-w-0 truncate">
                            {cat.name} <span className="text-xs text-zinc-500">({cat.slug})</span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
                {legacyCategorySlug ? (
                  <p className="text-xs text-zinc-500">
                    Đồng bộ tương thích ngược: <code className="text-zinc-400">{legacyCategorySlug}</code>
                  </p>
                ) : null}
              </div>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Excerpt</span>
              <textarea
                className={`${inputClassName} min-h-[80px]`}
                onChange={(e) => setExcerpt(e.target.value)}
                value={excerpt}
              />
            </label>
            <div className="space-y-2">
              <span className="text-sm text-zinc-300">Nội dung *</span>
              <ContentPostEditor disabled={pending || !canSave} onChange={setContent} value={content} />
              <p className="text-xs text-zinc-500">
                {wordCount} từ · ~{readingMin} phút đọc · {headings.total} heading · {internalLinks} link nội bộ
              </p>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Tags</span>
              <input
                className={inputClassName}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag-a, tag-b"
                value={tags}
              />
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
              <input
                checked={hubFeatured}
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-zinc-900 text-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400"
                onChange={(e) => setHubFeatured(e.target.checked)}
                type="checkbox"
              />
              <span className="space-y-0.5">
                <span className="text-sm font-medium text-zinc-200">Nên đọc trước (hub /bai-viet)</span>
                <span className="block text-xs text-zinc-500">
                  Ghim bài lên mục nổi bật trang Bài viết. Tự thêm tag{" "}
                  <code className="text-zinc-400">featured</code>.
                </span>
              </span>
            </label>
            <ContentPostCoverUploader disabled={!canSave} onChange={setCover} value={cover} />
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <section className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
            <h2 className="text-sm font-semibold text-white">Xuất bản</h2>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Trạng thái</span>
              <select
                className={inputClassName}
                onChange={(e) => setStatus(e.target.value as AdminContentPost["status"])}
                value={status}
              >
                {["draft", "published", "scheduled", "hidden", "archived"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Published at</span>
              <input
                className={inputClassName}
                onChange={(e) => setPublishedAt(e.target.value)}
                type="datetime-local"
                value={publishedAt}
              />
            </label>
            {status === "scheduled" ? (
              <label className="block space-y-1">
                <span className="text-xs text-zinc-500">Scheduled at *</span>
                <input
                  className={inputClassName}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  type="datetime-local"
                  value={scheduledAt}
                />
              </label>
            ) : null}
            {post ? (
              <div className="space-y-1 text-xs text-zinc-500">
                <p>Tạo: {formatDate(post.created_at)}</p>
                <p>Cập nhật: {formatDate(post.updated_at)}</p>
              </div>
            ) : null}
          </section>

          <section className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
            <h2 className="text-sm font-semibold text-white">SEO</h2>
            <label className="flex items-center gap-2">
              <input
                checked={indexable}
                className="h-4 w-4"
                onChange={(e) => {
                  setIndexable(e.target.checked);
                  if (!e.target.checked) setRobots("noindex,follow");
                  else setRobots("index,follow");
                }}
                type="checkbox"
              />
              <span className="text-sm text-zinc-300">Cho phép Google index</span>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Robots</span>
              <select
                className={inputClassName}
                onChange={(e) => setRobots(e.target.value as ContentPostRobots)}
                value={robots}
              >
                <option value="index,follow">index, follow</option>
                <option value="noindex,follow">noindex, follow</option>
                <option value="noindex,nofollow">noindex, nofollow</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">SEO title</span>
              <input className={inputClassName} onChange={(e) => setSeoTitle(e.target.value)} value={seoTitle} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Meta description</span>
              <textarea
                className={`${inputClassName} min-h-[72px]`}
                onChange={(e) => setSeoDescription(e.target.value)}
                value={seoDescription}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Canonical (/...)</span>
              <input
                className={inputClassName}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder="/bai-viet/slug"
                value={canonicalUrl}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">OG title</span>
              <input className={inputClassName} onChange={(e) => setOgTitle(e.target.value)} value={ogTitle} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">OG description</span>
              <input
                className={inputClassName}
                onChange={(e) => setOgDescription(e.target.value)}
                value={ogDescription}
              />
            </label>
          </section>

          <ContentPostSeoChecklist {...seoInput} />

          {showPreview ? (
            <ContentPostPreview
              ref={previewRef}
              content={content}
              coverUrl={cover.previewUrl ?? ""}
              excerpt={excerpt}
              seoDescription={seoDescription}
              seoTitle={seoTitle}
              slug={slug}
              title={title}
            />
          ) : null}
        </aside>
      </div>
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("vi-VN");
}

function statusToast(status: AdminContentPost["status"], fallback: string | null) {
  switch (status) {
    case "published":
      return "Đã đăng bài viết. Bài viết đang hiển thị công khai.";
    case "scheduled":
      return "Đã lên lịch đăng bài viết.";
    case "draft":
      return "Đã lưu nháp.";
    case "hidden":
      return "Đã ẩn bài viết.";
    case "archived":
      return "Đã lưu trữ bài viết.";
    default:
      return fallback;
  }
}
