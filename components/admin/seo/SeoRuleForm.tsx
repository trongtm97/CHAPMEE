"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  SeoCanonicalBadge,
  SeoFollowBadge,
  SeoIndexBadge
} from "@/components/admin/seo/SeoBadges";
import { isSensitiveSeoRoute } from "@/lib/seo/content-hub-seo-data";
import { saveAdminSeoRuleAction } from "@/lib/admin/seo-actions";
import type { AdminSeoCapabilities } from "@/types/admin-seo";
import type { SeoRule } from "@/types/platform-content";

type Props = {
  rule: SeoRule;
  capabilities: AdminSeoCapabilities;
};

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500 disabled:opacity-60";

export function SeoRuleForm({ rule, capabilities }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [editPattern, setEditPattern] = useState(false);
  const [routePattern, setRoutePattern] = useState(rule.route_pattern);
  const [pageType, setPageType] = useState(rule.page_type);
  const [indexable, setIndexable] = useState(rule.indexable);
  const [followLinks, setFollowLinks] = useState(rule.follow_links);
  const [includeSitemap, setIncludeSitemap] = useState(rule.include_sitemap);
  const [isActive, setIsActive] = useState(rule.is_active !== false);
  const [priority, setPriority] = useState(String(rule.priority ?? 0.5));
  const [changeFrequency, setChangeFrequency] = useState(rule.change_frequency ?? "weekly");
  const [titleTemplate, setTitleTemplate] = useState(rule.title_template ?? "");
  const [descriptionTemplate, setDescriptionTemplate] = useState(rule.description_template ?? "");
  const [canonicalMode, setCanonicalMode] = useState(rule.canonical_mode);
  const [customCanonicalUrl, setCustomCanonicalUrl] = useState(rule.custom_canonical_url ?? "");
  const [notes, setNotes] = useState(rule.notes ?? "");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await saveAdminSeoRuleAction({
        id: rule.id,
        route_pattern: routePattern,
        page_type: pageType,
        indexable,
        follow_links: followLinks,
        include_sitemap: includeSitemap,
        title_template: titleTemplate,
        description_template: descriptionTemplate,
        canonical_mode: canonicalMode,
        custom_canonical_url: customCanonicalUrl,
        priority: Number.parseFloat(priority) || 0.5,
        change_frequency: changeFrequency,
        is_active: isActive,
        notes,
        allowPatternEdit: editPattern
      });

      setToast(result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  const canSave = capabilities.canUpdateRules;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <form className="space-y-6" onSubmit={handleSubmit}>
        {toast ? (
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
            {toast}
          </div>
        ) : null}

        <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <h2 className="text-lg font-semibold text-zinc-100">Route</h2>

          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input checked={editPattern} onChange={(e) => setEditPattern(e.target.checked)} type="checkbox" />
            Cho phép sửa route pattern
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Route pattern</span>
            <input
              className={`${inputClassName} font-mono`}
              disabled={!editPattern || !canSave}
              onChange={(e) => setRoutePattern(e.target.value)}
              required
              value={routePattern}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Page type</span>
            <input
              className={inputClassName}
              disabled={!canSave}
              onChange={(e) => setPageType(e.target.value)}
              required
              value={pageType}
            />
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <h2 className="text-lg font-semibold text-zinc-100">Indexing</h2>
          {indexable && isSensitiveSeoRoute(routePattern) ? (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              Cảnh báo: route này thuộc khu vực private — không nên index.
            </div>
          ) : null}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                checked={indexable}
                disabled={!canSave}
                onChange={(e) => setIndexable(e.target.checked)}
                type="checkbox"
              />
              Được index
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                checked={followLinks}
                disabled={!canSave}
                onChange={(e) => setFollowLinks(e.target.checked)}
                type="checkbox"
              />
              Theo liên kết
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                checked={includeSitemap}
                disabled={!canSave}
                onChange={(e) => setIncludeSitemap(e.target.checked)}
                type="checkbox"
              />
              Đưa vào sitemap
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                checked={isActive}
                disabled={!canSave}
                onChange={(e) => setIsActive(e.target.checked)}
                type="checkbox"
              />
              Active
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-300">Priority (0–1)</span>
              <input
                className={inputClassName}
                disabled={!canSave}
                max={1}
                min={0}
                onChange={(e) => setPriority(e.target.value)}
                step={0.1}
                type="number"
                value={priority}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-300">Change frequency</span>
              <select
                className={inputClassName}
                disabled={!canSave}
                onChange={(e) => setChangeFrequency(e.target.value)}
                value={changeFrequency}
              >
                <option value="always">always</option>
                <option value="hourly">hourly</option>
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
                <option value="yearly">yearly</option>
                <option value="never">never</option>
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <h2 className="text-lg font-semibold text-zinc-100">Metadata templates</h2>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Title template</span>
            <input
              className={inputClassName}
              disabled={!canSave}
              onChange={(e) => setTitleTemplate(e.target.value)}
              placeholder="{title} | {site_name}"
              value={titleTemplate}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Description template</span>
            <textarea
              className={`${inputClassName} min-h-[100px]`}
              disabled={!canSave}
              onChange={(e) => setDescriptionTemplate(e.target.value)}
              value={descriptionTemplate}
            />
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <h2 className="text-lg font-semibold text-zinc-100">Canonical</h2>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Canonical mode</span>
            <select
              className={inputClassName}
              disabled={!canSave}
              onChange={(e) =>
                setCanonicalMode(e.target.value as SeoRule["canonical_mode"])
              }
              value={canonicalMode}
            >
              <option value="self">self</option>
              <option value="custom">custom</option>
              <option value="parent">parent</option>
              <option value="none">none</option>
            </select>
          </label>
          {canonicalMode === "custom" ? (
            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-300">Custom canonical URL</span>
              <input
                className={inputClassName}
                disabled={!canSave}
                onChange={(e) => setCustomCanonicalUrl(e.target.value)}
                placeholder="https://..."
                required
                value={customCanonicalUrl}
              />
            </label>
          ) : null}
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-300">Notes</span>
            <textarea
              className={`${inputClassName} min-h-[80px]`}
              disabled={!canSave}
              onChange={(e) => setNotes(e.target.value)}
              value={notes}
            />
          </label>
        </section>

        <div className="flex gap-2">
          {canSave ? (
            <button
              className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
              disabled={pending}
              type="submit"
            >
              {pending ? "Đang lưu…" : "Lưu rule"}
            </button>
          ) : null}
          <Link
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
            href="/admin/seo?tab=rules"
          >
            Quay lại
          </Link>
        </div>
      </form>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Preview</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <SeoIndexBadge indexable={indexable} />
            <SeoFollowBadge follow={followLinks} />
            <SeoCanonicalBadge mode={canonicalMode} />
          </div>
          <p className="mt-3 font-mono text-sm text-cyan-100">{routePattern}</p>
          <p className="mt-2 text-xs text-zinc-500">{pageType}</p>
        </section>
      </aside>
    </div>
  );
}
