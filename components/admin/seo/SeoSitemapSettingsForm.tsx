"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { saveSeoSitemapSettingsAction } from "@/lib/admin/seo-sitemap-actions";
import type { SeoSitemapSettings } from "@/lib/seo/sitemap-service";
type SitemapChildListItem = {
  id: string;
  path: string;
  label: string;
  page: number;
  estimatedUrlCount: number;
};

type SeoSitemapSettingsFormProps = {
  initialSettings: SeoSitemapSettings;
  canUpdate: boolean;
  sitemapChildren?: SitemapChildListItem[];
};

const CHANGEFREQ_OPTIONS = [
  "",
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never"
] as const;

export function SeoSitemapSettingsForm({
  initialSettings,
  canUpdate,
  sitemapChildren = []
}: SeoSitemapSettingsFormProps) {
  const [form, setForm] = useState(initialSettings);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await saveSeoSitemapSettingsAction({
        sitemapEnabled: form.sitemapEnabled,
        robotsEnabled: form.robotsEnabled,
        includeChapters: form.includeChapters,
        includeProfiles: form.includeProfiles,
        includeMedia: form.includeMedia,
        includeArticles: form.includeArticles,
        includeTaxonomy: form.includeTaxonomy,
        defaultChangefreq: form.defaultChangefreq,
        defaultPriority:
          form.defaultPriority != null ? String(form.defaultPriority) : null
      });

      setOk(result.ok);
      setMessage(result.message ?? "");
    });
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-zinc-100">Robots & Sitemap</h2>

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

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            checked={form.sitemapEnabled}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, sitemapEnabled: event.target.checked }))
            }
            type="checkbox"
          />
          Sitemap enabled (/sitemap.xml index)
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={form.includeChapters}
              disabled={!form.sitemapEnabled}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, includeChapters: event.target.checked }))
              }
              type="checkbox"
            />
            Include chapters
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={form.includeProfiles}
              disabled={!form.sitemapEnabled}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, includeProfiles: event.target.checked }))
              }
              type="checkbox"
            />
            Include profiles (@username)
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={form.includeMedia}
              disabled={!form.sitemapEnabled}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, includeMedia: event.target.checked }))
              }
              type="checkbox"
            />
            Include media catalogs
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={form.includeArticles}
              disabled={!form.sitemapEnabled}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, includeArticles: event.target.checked }))
              }
              type="checkbox"
            />
            Include articles / posts / reels
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={form.includeTaxonomy}
              disabled={!form.sitemapEnabled}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, includeTaxonomy: event.target.checked }))
              }
              type="checkbox"
            />
            Include taxonomy
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-300">Default changefreq (optional)</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  defaultChangefreq: (event.target.value || null) as typeof prev.defaultChangefreq
                }))
              }
              value={form.defaultChangefreq ?? ""}
            >
              {CHANGEFREQ_OPTIONS.map((value) => (
                <option key={value || "none"} value={value}>
                  {value || "— không set —"}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-300">Default priority 0–1 (optional)</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
              max="1"
              min="0"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  defaultPriority: event.target.value ? Number(event.target.value) : null
                }))
              }
              step="0.1"
              type="number"
              value={form.defaultPriority ?? ""}
            />
          </label>
        </div>

        {message ? (
          <p className={`text-sm ${ok ? "text-emerald-300" : "text-red-300"}`}>{message}</p>
        ) : null}

        {canUpdate ? (
          <Button disabled={pending} type="submit">
            {pending ? "Đang lưu…" : "Lưu cài đặt"}
          </Button>
        ) : null}
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-lg font-semibold text-zinc-100">Sitemap segments</h2>
        <p className="text-sm text-zinc-400">
          Index:{" "}
          <a className="text-cyan-300 hover:text-cyan-200" href="/sitemap.xml">
            /sitemap.xml
          </a>
          {" · "}
          <a className="text-cyan-300 hover:text-cyan-200" href="/robots.txt">
            /robots.txt
          </a>
        </p>
        <p className="text-xs text-zinc-500">
          Tự tách file khi segment vượt 200 URL (giống Rank Math). Mở /sitemap.xml trên trình duyệt
          để xem giao diện bảng HTML.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-zinc-400">
          {sitemapChildren.map((child) => (
            <li key={child.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <a className="font-mono text-cyan-300/90 hover:text-cyan-200" href={child.path}>
                {child.path}
              </a>
              <span className="text-xs text-zinc-500">
                {child.label}
                {child.page > 1 ? ` · trang ${child.page}` : ""} · ~{child.estimatedUrlCount} URL
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-zinc-500">
          Private routes (/admin, /studio, /me, …) và legacy profile URLs không có trong sitemap.
          lastmod lấy từ DB — không fake ngày hiện tại.
        </p>
      </Card>
    </form>
  );
}
