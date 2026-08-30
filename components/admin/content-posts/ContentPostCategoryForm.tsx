"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { ContentPostCoverUploader, type ContentPostCoverValue } from "@/components/admin/content-posts/ContentPostCoverUploader";
import { getMediaAssetPreviewAction } from "@/lib/admin/seo-center-actions";
import { saveContentPostCategoryAction, suggestContentPostCategorySlugAction } from "@/lib/admin/content-post-category-actions";
import { resolveStoredMediaUrl } from "@/lib/media/media-url";
import { slugifyVietnameseTitle, validateContentPostSlug } from "@/lib/platform-content/slug";
import type { ContentPostCategory, ContentPostCategoryStatus, ContentPostRobots } from "@/types/platform-content";

type Props = {
  mode: "create" | "edit";
  category?: ContentPostCategory | null;
};

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500";

export function ContentPostCategoryForm({ mode, category }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [slugManual, setSlugManual] = useState(Boolean(category?.slug));

  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? 0));
  const [status, setStatus] = useState<ContentPostCategoryStatus>(category?.status ?? "active");

  const [cover, setCover] = useState<ContentPostCoverValue>({
    mediaAssetId: category?.cover_media_asset_id ?? null,
    previewUrl: resolveStoredMediaUrl(category?.cover_image_url) ?? null
  });

  const [seoTitle, setSeoTitle] = useState(category?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(category?.seo_description ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(category?.canonical_url ?? "");
  const [indexable, setIndexable] = useState(category?.indexable ?? true);
  const [robots, setRobots] = useState<ContentPostRobots>(category?.robots ?? "index,follow");
  const [ogTitle, setOgTitle] = useState(category?.og_title ?? "");
  const [ogDescription, setOgDescription] = useState(category?.og_description ?? "");

  const [slugError, setSlugError] = useState<string | null>(null);
  const previewRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const assetId = category?.cover_media_asset_id?.trim();
    if (!assetId) return;
    void getMediaAssetPreviewAction(assetId).then((result) => {
      if (result.url) {
        setCover((prev) => (prev.mediaAssetId === assetId ? { ...prev, previewUrl: result.url } : prev));
      }
    });
  }, [category?.cover_media_asset_id]);

  useEffect(() => {
    if (slugManual || !name.trim()) return;
    const timer = window.setTimeout(async () => {
      const result = await suggestContentPostCategorySlugAction(name, category?.id);
      if (result.slug) {
        setSlug(result.slug);
        if (!canonicalUrl || canonicalUrl.startsWith("/bai-viet/danh-muc/")) {
          setCanonicalUrl(`/bai-viet/danh-muc/${result.slug}`);
        }
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [name, slugManual, category?.id, canonicalUrl]);

  const publicHref = useMemo(() => {
    if (!slug.trim()) return "";
    return `/bai-viet/danh-muc/${slug}`;
  }, [slug]);

  function handleSlugChange(value: string) {
    setSlugManual(true);
    const normalized = slugifyVietnameseTitle(value.replace(/-/g, " "));
    setSlug(normalized);
    setSlugError(validateContentPostSlug(normalized));
    if (!canonicalUrl || canonicalUrl.startsWith("/bai-viet/danh-muc/")) {
      setCanonicalUrl(normalized ? `/bai-viet/danh-muc/${normalized}` : "");
    }
  }

  function submit() {
    const validation = validateContentPostSlug(slug);
    if (validation) {
      setSlugError(validation);
      return;
    }

    startTransition(async () => {
      const result = await saveContentPostCategoryAction({
        id: category?.id,
        name,
        slug,
        description,
        sort_order: Number(sortOrder || 0),
        status,
        cover_media_asset_id: cover.mediaAssetId ?? undefined,
        canonical_url: canonicalUrl,
        indexable,
        robots,
        seo_title: seoTitle,
        seo_description: seoDescription,
        og_title: ogTitle,
        og_description: ogDescription,
        og_image_media_asset_id: cover.mediaAssetId ?? undefined,
        auto_slug: !slugManual
      });

      if (!result.ok) {
        setToast(result.message);
        return;
      }

      setToast(result.message);
      if (mode === "create" && result.id) {
        router.push(`/admin/content-hub/categories/${result.id}`);
        router.refresh();
        return;
      }

      router.refresh();
      if (previewRef.current) {
        previewRef.current.focus();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur">
        <Link className="text-sm text-zinc-400 hover:text-zinc-200" href="/admin/content-hub/categories">
          ← Quay lại
        </Link>

        {publicHref ? (
          <a
            ref={previewRef}
            className="rounded-xl border border-cyan-400/20 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-400/10"
            href={publicHref}
            rel="noreferrer"
            target="_blank"
          >
            Xem trang chuyên mục ↗
          </a>
        ) : null}

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-60"
            disabled={pending}
            onClick={submit}
            type="button"
          >
            {pending ? "Đang lưu…" : "Lưu"}
          </button>
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
            <h2 className="text-lg font-semibold text-white">Thông tin chuyên mục</h2>

            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Tên chuyên mục *</span>
              <input className={inputClassName} onChange={(e) => setName(e.target.value)} required value={name} />
            </label>

            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Slug *</span>
              <input className={inputClassName} onChange={(e) => handleSlugChange(e.target.value)} required value={slug} />
              {slugError ? <p className="text-xs text-red-300">{slugError}</p> : null}
            </label>

            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Mô tả</span>
              <textarea
                className={`${inputClassName} min-h-[90px]`}
                onChange={(e) => setDescription(e.target.value)}
                value={description}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm text-zinc-300">Trạng thái</span>
                <select
                  className={inputClassName}
                  onChange={(e) => setStatus(e.target.value as ContentPostCategoryStatus)}
                  value={status}
                >
                  <option value="active">Hiển thị</option>
                  <option value="hidden">Ẩn</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm text-zinc-300">Thứ tự</span>
                <input
                  className={inputClassName}
                  inputMode="numeric"
                  onChange={(e) => setSortOrder(e.target.value)}
                  value={sortOrder}
                />
              </label>
            </div>

            <ContentPostCoverUploader disabled={pending} onChange={setCover} value={cover} />
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
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
                placeholder="/bai-viet/danh-muc/slug"
                value={canonicalUrl}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">OG title</span>
              <input className={inputClassName} onChange={(e) => setOgTitle(e.target.value)} value={ogTitle} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">OG description</span>
              <input className={inputClassName} onChange={(e) => setOgDescription(e.target.value)} value={ogDescription} />
            </label>
            <p className="text-xs text-zinc-500">OG image: dùng ảnh bìa chuyên mục.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

