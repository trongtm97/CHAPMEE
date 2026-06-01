"use client";

import Link from "next/link";
import {
  formatSeoDate,
  SeoCanonicalBadge,
  SeoFollowBadge,
  SeoIndexBadge
} from "@/components/admin/seo/SeoBadges";
import type { AdminSeoCapabilities } from "@/types/admin-seo";
import type { SeoRule } from "@/types/platform-content";

type Props = {
  rules: SeoRule[];
  capabilities: AdminSeoCapabilities;
  loadError?: string | null;
};

export function AdminSeoRulesPage({ rules, capabilities, loadError }: Props) {
  if (loadError) {
    return (
      <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
        {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">SEO Rules</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {rules.length} rules · chỉnh index/noindex, title/meta template, canonical.
        </p>
      </header>

      <div className="hidden overflow-hidden rounded-2xl border border-white/10 lg:block">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-zinc-950/80 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Route pattern</th>
              <th className="px-4 py-3">Page type</th>
              <th className="px-4 py-3">Index</th>
              <th className="px-4 py-3">Follow</th>
              <th className="px-4 py-3">Title template</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Canonical</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-zinc-950/40 text-zinc-200">
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className="px-4 py-3 font-mono text-xs text-cyan-100">{rule.route_pattern}</td>
                <td className="px-4 py-3 text-zinc-400">{rule.page_type}</td>
                <td className="px-4 py-3">
                  <SeoIndexBadge indexable={rule.indexable} />
                </td>
                <td className="px-4 py-3">
                  <SeoFollowBadge follow={rule.follow_links} />
                </td>
                <td className="max-w-[140px] truncate px-4 py-3 text-xs text-zinc-500">
                  {rule.title_template ?? "—"}
                </td>
                <td className="max-w-[140px] truncate px-4 py-3 text-xs text-zinc-500">
                  {rule.description_template ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <SeoCanonicalBadge mode={rule.canonical_mode} />
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">{formatSeoDate(rule.updated_at)}</td>
                <td className="px-4 py-3">
                  {capabilities.canUpdateRules ? (
                    <Link
                      className="font-semibold text-cyan-300 hover:text-cyan-200"
                      href={`/admin/seo/rules/${rule.id}`}
                    >
                      Edit
                    </Link>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {rules.map((rule) => (
          <article className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4" key={rule.id}>
            <div className="flex flex-wrap gap-2">
              <SeoIndexBadge indexable={rule.indexable} />
              <SeoFollowBadge follow={rule.follow_links} />
              <SeoCanonicalBadge mode={rule.canonical_mode} />
            </div>
            <p className="mt-2 font-mono text-sm text-cyan-100">{rule.route_pattern}</p>
            <p className="text-xs text-zinc-500">{rule.page_type}</p>
            {capabilities.canUpdateRules ? (
              <Link
                className="mt-3 inline-flex text-sm font-semibold text-cyan-300"
                href={`/admin/seo/rules/${rule.id}`}
              >
                Edit →
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
