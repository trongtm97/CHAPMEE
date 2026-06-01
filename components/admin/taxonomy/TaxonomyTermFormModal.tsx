"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import {
  listTaxonomyTermsAdminAction,
  saveTaxonomyTermAdminAction
} from "@/lib/admin/taxonomy-actions";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";
import {
  defaultFlagsForType,
  parseAliasesInput
} from "@/lib/taxonomy/admin-validation";
import { taxonomyParentTypeFor } from "@/lib/taxonomy/parent-types";
import { slugify } from "@/lib/slugify";
import { TAXONOMY_TYPES } from "@/types/taxonomy";
import { taxonomyTermPublicUrl } from "@/lib/taxonomy/public-url";
import type { TaxonomyAdminNotify } from "@/lib/taxonomy/admin-ui";
import type { TaxonomyTermRow, TaxonomyType } from "@/types/taxonomy";

type TaxonomyTermFormModalProps = {
  open: boolean;
  term: TaxonomyTermRow | null;
  defaultType?: TaxonomyType;
  onClose: () => void;
  onSaved: () => void;
  onMessage: TaxonomyAdminNotify;
};

export function TaxonomyTermFormModal({
  open,
  term,
  defaultType = "main_genre",
  onClose,
  onSaved,
  onMessage
}: TaxonomyTermFormModalProps) {
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<TaxonomyType>(defaultType);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [displayLabel, setDisplayLabel] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("");
  const [aliasesText, setAliasesText] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [isSelectable, setIsSelectable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [useForSeo, setUseForSeo] = useState(true);
  const [useForDiscover, setUseForDiscover] = useState(true);
  const [useForRanking, setUseForRanking] = useState(false);
  const [useForModeration, setUseForModeration] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoH1, setSeoH1] = useState("");
  const [seoIntro, setSeoIntro] = useState("");
  const [canonicalPath, setCanonicalPath] = useState("");
  const [seoIndexable, setSeoIndexable] = useState(true);
  const [sitemapPriority, setSitemapPriority] = useState("");
  const [sitemapChangefreq, setSitemapChangefreq] = useState("weekly");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [useForPinterestFeed, setUseForPinterestFeed] = useState(false);
  const [minStoriesOverride, setMinStoriesOverride] = useState("");
  const [parentOptions, setParentOptions] = useState<TaxonomyTermRow[]>([]);

  const parentType = taxonomyParentTypeFor(type);
  const isEdit = Boolean(term);
  const publicPreviewUrl = taxonomyTermPublicUrl(type, slug, isPublic);

  useEffect(() => {
    if (!open) return;
    if (term) {
      setType(term.type);
      setName(term.name);
      setSlug(term.slug);
      setParentId(term.parent_id ?? "");
      setDescription(term.description ?? "");
      setDisplayLabel(term.display_label ?? "");
      setInternalNote(term.internal_note ?? "");
      setIcon(term.icon ?? "");
      setColor(term.color ?? "");
      setAliasesText(term.aliases.join("; "));
      setSortOrder(String(term.sort_order));
      setIsActive(term.is_active);
      setIsPublic(term.is_public);
      setIsSelectable(term.is_selectable_by_creator);
      setIsFeatured(term.is_featured);
      setUseForSeo(term.use_for_seo);
      setUseForDiscover(term.use_for_discover);
      setUseForRanking(term.use_for_ranking);
      setUseForModeration(term.use_for_moderation);
      setSeoTitle(term.seo_title ?? "");
      setSeoDescription(term.seo_description ?? "");
      setSeoH1(term.seo_h1 ?? "");
      setSeoIntro(term.seo_intro ?? "");
      setCanonicalPath(term.canonical_path ?? "");
      setSeoIndexable(term.seo_indexable);
      setSitemapPriority(term.sitemap_priority != null ? String(term.sitemap_priority) : "");
      setSitemapChangefreq(term.sitemap_changefreq ?? "weekly");
      setOgImageUrl(term.og_image_url ?? "");
      setUseForPinterestFeed(term.use_for_pinterest_feed);
      setMinStoriesOverride(
        term.min_stories_override != null ? String(term.min_stories_override) : ""
      );
    } else {
      const defaults = defaultFlagsForType(defaultType);
      setType(defaultType);
      setName("");
      setSlug("");
      setParentId("");
      setDescription("");
      setDisplayLabel("");
      setInternalNote("");
      setIcon("");
      setColor("");
      setAliasesText("");
      setSortOrder("0");
      setIsActive(true);
      setIsPublic(true);
      setIsSelectable(defaults.is_selectable_by_creator ?? true);
      setIsFeatured(false);
      setUseForSeo(defaults.use_for_seo ?? true);
      setUseForDiscover(defaults.use_for_discover ?? true);
      setUseForRanking(defaults.use_for_ranking ?? false);
      setUseForModeration(defaults.use_for_moderation ?? false);
      setSeoTitle("");
      setSeoDescription("");
      setSeoH1("");
      setSeoIntro("");
      setCanonicalPath("");
      setSeoIndexable(true);
      setSitemapPriority("");
      setSitemapChangefreq("weekly");
      setOgImageUrl("");
      setUseForPinterestFeed(false);
      setMinStoriesOverride("");
    }
  }, [open, term, defaultType]);

  useEffect(() => {
    if (!open || !parentType) {
      setParentOptions([]);
      return;
    }
    startTransition(async () => {
      const result = await listTaxonomyTermsAdminAction({
        type: parentType,
        page: 1,
        pageSize: 200,
        activeOnly: true
      });
      setParentOptions(result.items.filter((row) => row.id !== term?.id));
    });
  }, [open, parentType, term?.id]);

  const typeOptions = useMemo(() => TAXONOMY_TYPES, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-[#0c1118] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {isEdit ? "Sửa taxonomy" : "Thêm taxonomy"}
            </h2>
            <p className="text-xs text-zinc-500">
              {isEdit ? `${term?.slug} · dùng ${term?.usage_count} lần` : "Tạo nhãn mới cho hệ thống"}
            </p>
          </div>
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
        </div>

        <form
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await saveTaxonomyTermAdminAction({
                id: term?.id,
                data: {
                  type,
                  name,
                  slug,
                  parent_id: parentId || null,
                  description: description || null,
                  display_label: displayLabel || null,
                  internal_note: internalNote || null,
                  icon: icon || null,
                  color: color || null,
                  aliases: parseAliasesInput(aliasesText),
                  sort_order: Number(sortOrder) || 0,
                  is_active: isActive,
                  is_public: isPublic,
                  is_selectable_by_creator: isSelectable,
                  is_featured: isFeatured,
                  use_for_seo: useForSeo,
                  use_for_discover: useForDiscover,
                  use_for_ranking: useForRanking,
                  use_for_moderation: useForModeration,
                  seo_title: seoTitle || null,
                  seo_description: seoDescription || null,
                  seo_h1: seoH1 || null,
                  seo_intro: seoIntro || null,
                  canonical_path: canonicalPath || null,
                  seo_indexable: seoIndexable,
                  sitemap_priority: sitemapPriority ? Number(sitemapPriority) : null,
                  sitemap_changefreq: sitemapChangefreq || null,
                  og_image_url: ogImageUrl || null,
                  use_for_pinterest_feed: useForPinterestFeed,
                  min_stories_override: minStoriesOverride ? Number(minStoriesOverride) : null
                }
              });
              if (result.error) {
                onMessage(result.error);
                return;
              }
              onMessage(isEdit ? "Đã cập nhật nhãn." : "Đã tạo nhãn mới.", "success");
              onSaved();
              onClose();
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-zinc-400">Nhóm</span>
              <select
                className="min-h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-white"
                disabled={isEdit}
                onChange={(e) => {
                  const next = e.target.value as TaxonomyType;
                  setType(next);
                  const defaults = defaultFlagsForType(next);
                  setIsSelectable(defaults.is_selectable_by_creator ?? true);
                  setUseForModeration(defaults.use_for_moderation ?? false);
                  setUseForRanking(defaults.use_for_ranking ?? false);
                }}
                value={type}
              >
                {typeOptions.map((option) => (
                  <option key={option} value={option}>
                    {TAXONOMY_TYPE_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
            {parentType ? (
              <label className="space-y-1 text-sm">
                <span className="text-zinc-400">{TAXONOMY_TYPE_LABELS[parentType]} cha</span>
                <select
                  className="min-h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-white"
                  onChange={(e) => setParentId(e.target.value)}
                  value={parentId}
                >
                  <option value="">— Không —</option>
                  {parentOptions.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div />
            )}
            <Input
              label="Tên"
              onChange={(e) => {
                setName(e.target.value);
                if (!isEdit) setSlug(slugify(e.target.value));
              }}
              required
              value={name}
            />
            <Input
              label="Slug"
              onChange={(e) => setSlug(e.target.value)}
              required
              value={slug}
            />
            <Input
              label="Nhãn hiển thị"
              onChange={(e) => setDisplayLabel(e.target.value)}
              value={displayLabel}
            />
            <Input
              label="Thứ tự"
              onChange={(e) => setSortOrder(e.target.value)}
              type="number"
              value={sortOrder}
            />
            <Input label="Icon" onChange={(e) => setIcon(e.target.value)} value={icon} />
            <Input label="Màu" onChange={(e) => setColor(e.target.value)} value={color} />
          </div>

          <Textarea
            label="Mô tả"
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            value={description}
          />
          <Textarea
            label="Aliases (phân tách bằng dấu phẩy hoặc xuống dòng)"
            onChange={(e) => setAliasesText(e.target.value)}
            rows={2}
            value={aliasesText}
          />
          <Textarea
            label="Ghi chú nội bộ"
            onChange={(e) => setInternalNote(e.target.value)}
            rows={2}
            value={internalNote}
          />

          <section className="space-y-3 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
            <h3 className="text-sm font-semibold text-cyan-100">SEO & Sitemap</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="SEO title" onChange={(e) => setSeoTitle(e.target.value)} value={seoTitle} />
              <Input
                label="Canonical path"
                onChange={(e) => setCanonicalPath(e.target.value)}
                placeholder="/the-loai/ngon-tinh"
                value={canonicalPath}
              />
              <Input label="H1" onChange={(e) => setSeoH1(e.target.value)} value={seoH1} />
              <Input
                label="Sitemap priority (0–1)"
                onChange={(e) => setSitemapPriority(e.target.value)}
                type="number"
                value={sitemapPriority}
              />
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-zinc-400">SEO description</span>
                <textarea
                  className="min-h-16 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
                  onChange={(e) => setSeoDescription(e.target.value)}
                  value={seoDescription}
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-zinc-400">Intro (landing)</span>
                <textarea
                  className="min-h-16 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
                  onChange={(e) => setSeoIntro(e.target.value)}
                  value={seoIntro}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-400">Sitemap changefreq</span>
                <select
                  className="min-h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-white"
                  onChange={(e) => setSitemapChangefreq(e.target.value)}
                  value={sitemapChangefreq}
                >
                  {["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"].map(
                    (value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    )
                  )}
                </select>
              </label>
              <Input
                label="OG image URL"
                onChange={(e) => setOgImageUrl(e.target.value)}
                value={ogImageUrl}
              />
              <Input
                label="Min stories override"
                onChange={(e) => setMinStoriesOverride(e.target.value)}
                type="number"
                value={minStoriesOverride}
              />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
              <label className="flex items-center gap-2">
                <input
                  checked={seoIndexable}
                  onChange={(e) => setSeoIndexable(e.target.checked)}
                  type="checkbox"
                />
                Cho phép index (seo_indexable)
              </label>
              <label className="flex items-center gap-2">
                <input
                  checked={useForPinterestFeed}
                  onChange={(e) => setUseForPinterestFeed(e.target.checked)}
                  type="checkbox"
                />
                Pinterest feed
              </label>
            </div>
          </section>

          <div className="grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
            {(
              [
                { checked: isActive, set: setIsActive, label: "Đang hoạt động" },
                { checked: isPublic, set: setIsPublic, label: "Công khai" },
                {
                  checked: isSelectable,
                  set: setIsSelectable,
                  label: "Creator chọn được"
                },
                { checked: isFeatured, set: setIsFeatured, label: "Nổi bật" },
                { checked: useForSeo, set: setUseForSeo, label: "Dùng cho SEO" },
                {
                  checked: useForDiscover,
                  set: setUseForDiscover,
                  label: "Dùng cho Discover"
                },
                {
                  checked: useForRanking,
                  set: setUseForRanking,
                  label: "Dùng cho Ranking"
                },
                {
                  checked: useForModeration,
                  set: setUseForModeration,
                  label: "Dùng cho Moderation"
                }
              ] as const
            ).map((row) => (
              <label className="flex items-center gap-2" key={row.label}>
                <input
                  checked={row.checked}
                  onChange={(e) => row.set(e.target.checked)}
                  type="checkbox"
                />
                {row.label}
              </label>
            ))}
          </div>

          {publicPreviewUrl ? (
            <p className="text-xs text-zinc-500">
              Trang công khai:{" "}
              <Link
                className="text-cyan-300 hover:underline"
                href={publicPreviewUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {publicPreviewUrl}
              </Link>
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button onClick={onClose} type="button" variant="secondary">
              Hủy
            </Button>
            <Button loading={pending} type="submit">
              Lưu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
