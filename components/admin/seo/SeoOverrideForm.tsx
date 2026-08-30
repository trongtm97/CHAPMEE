"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SeoGooglePreview } from "@/components/admin/seo/SeoGooglePreview";
import { SeoMediaAssetField } from "@/components/admin/seo/SeoMediaAssetField";
import { SeoSocialPreview } from "@/components/admin/seo/SeoSocialPreview";
import { Button, Card, Input } from "@/components/ui";
import {
  deleteSeoOverrideAction,
  getMediaAssetPreviewAction,
  saveSeoOverrideAction
} from "@/lib/admin/seo-center-actions";
import type { SeoOverrideRow } from "@/lib/db/schema/seo-center";
import { SEO_TARGET_TYPES } from "@/lib/seo/seo-constants";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { isPrivateSeoPath, normalizeSeoPath } from "@/lib/seo/seo-validation";

type SeoOverrideFormProps = {
  initial?: SeoOverrideRow | null;
  canUpdate: boolean;
  siteName?: string;
  defaultPath?: string;
  defaultNoindex?: boolean;
};

const EMPTY = {
  targetType: "route" as string,
  targetId: "",
  path: "",
  locale: "vi",
  title: "",
  metaDescription: "",
  canonicalUrl: "",
  ogTitle: "",
  ogDescription: "",
  ogImageAssetId: null as string | null,
  twitterTitle: "",
  twitterDescription: "",
  twitterImageAssetId: null as string | null,
  robotsIndex: null as boolean | null,
  robotsFollow: null as boolean | null,
  schemaType: "",
  isEnabled: true
};

export function SeoOverrideForm({
  initial,
  canUpdate,
  siteName = "ChapMee",
  defaultPath = "",
  defaultNoindex = false
}: SeoOverrideFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    targetType: initial?.targetType ?? EMPTY.targetType,
    targetId: initial?.targetId ?? EMPTY.targetId,
    path: initial?.path ?? defaultPath ?? EMPTY.path,
    locale: initial?.locale ?? EMPTY.locale,
    title: initial?.title ?? EMPTY.title,
    metaDescription: initial?.metaDescription ?? EMPTY.metaDescription,
    canonicalUrl: initial?.canonicalUrl ?? EMPTY.canonicalUrl,
    ogTitle: initial?.ogTitle ?? EMPTY.ogTitle,
    ogDescription: initial?.ogDescription ?? EMPTY.ogDescription,
    ogImageAssetId: initial?.ogImageAssetId ?? EMPTY.ogImageAssetId,
    twitterTitle: initial?.twitterTitle ?? EMPTY.twitterTitle,
    twitterDescription: initial?.twitterDescription ?? EMPTY.twitterDescription,
    twitterImageAssetId: initial?.twitterImageAssetId ?? EMPTY.twitterImageAssetId,
    robotsIndex: initial?.robotsIndex ?? (defaultNoindex ? false : EMPTY.robotsIndex),
    robotsFollow: initial?.robotsFollow ?? EMPTY.robotsFollow,
    schemaType: initial?.schemaType ?? EMPTY.schemaType,
    isEnabled: initial?.isEnabled ?? EMPTY.isEnabled
  });
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ogPreviewUrl, setOgPreviewUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewCanonical = useMemo(() => {
    if (form.canonicalUrl.trim()) {
      if (form.canonicalUrl.startsWith("/")) {
        return buildCanonicalUrl(normalizeSeoPath(form.canonicalUrl)) ?? form.canonicalUrl;
      }
      return form.canonicalUrl;
    }
    if (form.path.trim()) {
      return buildCanonicalUrl(normalizeSeoPath(form.path));
    }
    return undefined;
  }, [form.canonicalUrl, form.path]);

  const googleTitle = form.title.trim() || form.ogTitle.trim();
  const googleDescription = form.metaDescription.trim() || form.ogDescription.trim();
  const socialTitle = form.ogTitle.trim() || form.title.trim();
  const socialDescription = form.ogDescription.trim() || form.metaDescription.trim();

  useEffect(() => {
    const assetId = form.ogImageAssetId ?? form.twitterImageAssetId;
    if (!assetId) {
      setOgPreviewUrl(null);
      return;
    }
    void getMediaAssetPreviewAction(assetId).then((result) => {
      setOgPreviewUrl(result.url);
    });
  }, [form.ogImageAssetId, form.twitterImageAssetId]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await saveSeoOverrideAction({
        id: initial?.id,
        targetType: form.targetType,
        targetId: form.targetId.trim() || null,
        path: form.path.trim() || null,
        locale: form.locale,
        title: form.title || null,
        metaDescription: form.metaDescription || null,
        canonicalUrl: form.canonicalUrl || null,
        ogTitle: form.ogTitle || null,
        ogDescription: form.ogDescription || null,
        ogImageAssetId: form.ogImageAssetId,
        twitterTitle: form.twitterTitle || null,
        twitterDescription: form.twitterDescription || null,
        twitterImageAssetId: form.twitterImageAssetId,
        robotsIndex: form.robotsIndex,
        robotsFollow: form.robotsFollow,
        schemaType: form.schemaType || null,
        isEnabled: form.isEnabled
      });

      setOk(result.ok);
      setMessage(result.message ?? (result.ok ? "Đã lưu." : "Lỗi."));
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      if (result.ok && result.id && !initial?.id) {
        router.push(`/admin/seo/overrides/${result.id}`);
      }
    });
  }

  function onDelete() {
    if (!initial?.id || !window.confirm("Xóa override này?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteSeoOverrideAction(initial.id);
      setMessage(result.message ?? "");
      setOk(result.ok);
      if (result.ok) {
        router.push("/admin/seo/overrides");
      }
    });
  }

  return (
    <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" onSubmit={onSubmit}>
      <Card className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-300">Target type</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, targetType: event.target.value }))
              }
              value={form.targetType}
            >
              {SEO_TARGET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {fieldErrors.targetType ? (
              <span className="text-xs text-red-300">{fieldErrors.targetType}</span>
            ) : null}
          </label>
          <Input
            label="Locale"
            onChange={(event) => setForm((prev) => ({ ...prev, locale: event.target.value }))}
            value={form.locale}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            error={fieldErrors.path}
            label="Path (canonical route)"
            onChange={(event) => setForm((prev) => ({ ...prev, path: event.target.value }))}
            placeholder="/discover"
            value={form.path}
          />
          <Input
            label="Target ID (UUID entity)"
            onChange={(event) => setForm((prev) => ({ ...prev, targetId: event.target.value }))}
            placeholder="story/profile UUID"
            value={form.targetId ?? ""}
          />
        </div>

        {isPrivateSeoPath(form.path) ? (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100/90">
            Path thuộc khu vực private — trang này thường nên noindex (robots index = off).
          </div>
        ) : null}

        <Input
          error={fieldErrors.title}
          label="Title"
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          value={form.title}
        />
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-300">Meta description</span>
          <textarea
            className="min-h-[80px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) =>
              setForm((prev) => ({ ...prev, metaDescription: event.target.value }))
            }
            value={form.metaDescription}
          />
        </label>

        <Input
          error={fieldErrors.canonicalUrl}
          label="Canonical URL"
          onChange={(event) =>
            setForm((prev) => ({ ...prev, canonicalUrl: event.target.value }))
          }
          placeholder="/discover hoặc https://chapmee.vn/..."
          value={form.canonicalUrl}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="OG title"
            onChange={(event) => setForm((prev) => ({ ...prev, ogTitle: event.target.value }))}
            value={form.ogTitle}
          />
          <Input
            label="Twitter title"
            onChange={(event) =>
              setForm((prev) => ({ ...prev, twitterTitle: event.target.value }))
            }
            value={form.twitterTitle}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-300">OG description</span>
            <textarea
              className="min-h-[72px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, ogDescription: event.target.value }))
              }
              value={form.ogDescription}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-300">Twitter description</span>
            <textarea
              className="min-h-[72px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, twitterDescription: event.target.value }))
              }
              value={form.twitterDescription}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SeoMediaAssetField
            label="OG image"
            name="ogImageAssetId"
            onChange={(assetId) => setForm((prev) => ({ ...prev, ogImageAssetId: assetId }))}
            value={form.ogImageAssetId}
          />
          <SeoMediaAssetField
            label="Twitter image"
            name="twitterImageAssetId"
            onChange={(assetId) =>
              setForm((prev) => ({ ...prev, twitterImageAssetId: assetId }))
            }
            value={form.twitterImageAssetId}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={form.robotsIndex ?? false}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  robotsIndex: event.target.checked ? true : null
                }))
              }
              type="checkbox"
            />
            robots index
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={form.robotsFollow ?? false}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  robotsFollow: event.target.checked ? true : null
                }))
              }
              type="checkbox"
            />
            robots follow
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={form.isEnabled}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isEnabled: event.target.checked }))
              }
              type="checkbox"
            />
            Enabled
          </label>
        </div>

        <Input
          label="Schema type (optional)"
          onChange={(event) => setForm((prev) => ({ ...prev, schemaType: event.target.value }))}
          placeholder="WebPage, Article, …"
          value={form.schemaType}
        />

        {message ? (
          <p className={`text-sm ${ok ? "text-emerald-300" : "text-red-300"}`}>{message}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {canUpdate ? (
            <Button disabled={pending} type="submit">
              {pending ? "Đang lưu…" : initial?.id ? "Cập nhật override" : "Tạo override"}
            </Button>
          ) : null}
          {canUpdate && initial?.id ? (
            <Button disabled={pending} onClick={onDelete} type="button" variant="secondary">
              Xóa
            </Button>
          ) : null}
        </div>
      </Card>

      <div className="space-y-4">
        <SeoGooglePreview
          description={googleDescription}
          title={googleTitle}
          url={previewCanonical}
        />
        <SeoSocialPreview
          description={socialDescription}
          imageUrl={ogPreviewUrl}
          siteName={siteName}
          title={socialTitle}
          url={previewCanonical}
        />
      </div>
    </form>
  );
}
