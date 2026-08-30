"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { SeoGooglePreview } from "@/components/admin/seo/SeoGooglePreview";
import { SeoMediaAssetField } from "@/components/admin/seo/SeoMediaAssetField";
import { SeoSocialPreview } from "@/components/admin/seo/SeoSocialPreview";
import { Button, Card, Input } from "@/components/ui";
import {
  getMediaAssetPreviewAction,
  saveSeoSettingsAction
} from "@/lib/admin/seo-center-actions";
import type { SeoSettingsRow } from "@/lib/db/schema/seo-center";
import { interpolateSeoTemplate } from "@/lib/seo/interpolate-seo-template";

type SeoSettingsFormProps = {
  initialSettings: SeoSettingsRow | null;
  canUpdate: boolean;
  defaultOgPreviewUrl?: string | null;
};

const DEFAULT_FORM = {
  siteName: "ChapMee",
  defaultTitleTemplate: "{page_title} | ChapMee",
  defaultDescriptionTemplate:
    "ChapMee - Nền tảng giải trí text/story dành cho người đọc và tác giả.",
  titleSeparator: "|",
  defaultOgImageAssetId: null as string | null,
  defaultRobotsIndex: true,
  defaultRobotsFollow: true,
  sitemapEnabled: true,
  robotsEnabled: true
};

export function SeoSettingsForm({
  initialSettings,
  canUpdate,
  defaultOgPreviewUrl
}: SeoSettingsFormProps) {
  const [form, setForm] = useState({
    siteName: initialSettings?.siteName ?? DEFAULT_FORM.siteName,
    defaultTitleTemplate:
      initialSettings?.defaultTitleTemplate ?? DEFAULT_FORM.defaultTitleTemplate,
    defaultDescriptionTemplate:
      initialSettings?.defaultDescriptionTemplate ?? DEFAULT_FORM.defaultDescriptionTemplate,
    titleSeparator: initialSettings?.titleSeparator ?? DEFAULT_FORM.titleSeparator,
    defaultOgImageAssetId: initialSettings?.defaultOgImageAssetId ?? null,
    defaultRobotsIndex: initialSettings?.defaultRobotsIndex ?? DEFAULT_FORM.defaultRobotsIndex,
    defaultRobotsFollow: initialSettings?.defaultRobotsFollow ?? DEFAULT_FORM.defaultRobotsFollow,
    sitemapEnabled: initialSettings?.sitemapEnabled ?? DEFAULT_FORM.sitemapEnabled,
    robotsEnabled: initialSettings?.robotsEnabled ?? DEFAULT_FORM.robotsEnabled
  });
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ogPreviewUrl, setOgPreviewUrl] = useState<string | null>(defaultOgPreviewUrl ?? null);
  const [pending, startTransition] = useTransition();

  const previewTitle = useMemo(
    () =>
      interpolateSeoTemplate(form.defaultTitleTemplate, {
        site_name: form.siteName,
        page_title: "Trang mẫu"
      }),
    [form.defaultTitleTemplate, form.siteName]
  );

  const previewDescription = useMemo(
    () =>
      interpolateSeoTemplate(form.defaultDescriptionTemplate, {
        site_name: form.siteName,
        page_title: "Trang mẫu"
      }),
    [form.defaultDescriptionTemplate, form.siteName]
  );

  useEffect(() => {
    const assetId = form.defaultOgImageAssetId;
    if (!assetId) {
      setOgPreviewUrl(null);
      return;
    }
    void getMediaAssetPreviewAction(assetId).then((result) => {
      setOgPreviewUrl(result.url);
    });
  }, [form.defaultOgImageAssetId]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await saveSeoSettingsAction(form);
      setOk(result.ok);
      setMessage(result.message ?? (result.ok ? "Đã lưu." : "Lỗi."));
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
    });
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={onSubmit}>
      <Card className="space-y-4 p-5">
        <Input
          error={fieldErrors.siteName}
          label="Site name"
          onChange={(event) => setForm((prev) => ({ ...prev, siteName: event.target.value }))}
          required
          value={form.siteName}
        />
        <Input
          error={fieldErrors.defaultTitleTemplate}
          label="Default title template"
          onChange={(event) =>
            setForm((prev) => ({ ...prev, defaultTitleTemplate: event.target.value }))
          }
          required
          value={form.defaultTitleTemplate}
        />
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-300">Default description template</span>
          <textarea
            className="min-h-[88px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) =>
              setForm((prev) => ({ ...prev, defaultDescriptionTemplate: event.target.value }))
            }
            required
            value={form.defaultDescriptionTemplate}
          />
          {fieldErrors.defaultDescriptionTemplate ? (
            <span className="text-xs text-red-300">{fieldErrors.defaultDescriptionTemplate}</span>
          ) : null}
        </label>
        <Input
          label="Title separator"
          onChange={(event) =>
            setForm((prev) => ({ ...prev, titleSeparator: event.target.value }))
          }
          value={form.titleSeparator}
        />

        <SeoMediaAssetField
          hint="Ảnh OG mặc định toàn site — lưu media_asset_id, không URL."
          label="Default OG image"
          name="defaultOgImageAssetId"
          onChange={(assetId) => {
            setForm((prev) => ({ ...prev, defaultOgImageAssetId: assetId }));
          }}
          value={form.defaultOgImageAssetId}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={form.defaultRobotsIndex}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, defaultRobotsIndex: event.target.checked }))
              }
              type="checkbox"
            />
            Default robots index
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={form.defaultRobotsFollow}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, defaultRobotsFollow: event.target.checked }))
              }
              type="checkbox"
            />
            Default robots follow
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={form.sitemapEnabled}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, sitemapEnabled: event.target.checked }))
              }
              type="checkbox"
            />
            Sitemap enabled
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={form.robotsEnabled}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, robotsEnabled: event.target.checked }))
              }
              type="checkbox"
            />
            robots.txt enabled
          </label>
        </div>

        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100/90">
          Trang private (/admin, /studio, /me, /messages, /login, /register, /payment, …) nên
          noindex — engine áp dụng qua route rules, không cần override từng trang private.
        </div>

        {message ? (
          <p className={`text-sm ${ok ? "text-emerald-300" : "text-red-300"}`}>{message}</p>
        ) : null}

        {canUpdate ? (
          <Button disabled={pending} type="submit">
            {pending ? "Đang lưu…" : "Lưu cài đặt SEO"}
          </Button>
        ) : (
          <p className="text-sm text-zinc-500">Bạn chỉ có quyền xem.</p>
        )}
      </Card>

      <div className="space-y-4">
        <SeoGooglePreview
          description={previewDescription}
          title={previewTitle}
          url="chapmee.vn"
        />
        <SeoSocialPreview
          description={previewDescription}
          imageUrl={ogPreviewUrl}
          siteName={form.siteName}
          title={previewTitle}
        />
      </div>
    </form>
  );
}
