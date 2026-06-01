"use client";

import Link from "next/link";
import { AUDIT_SEVERITY_STYLES } from "@/components/admin/seo/SeoBadges";
import type { SeoDashboardData } from "@/types/admin-seo";
import type { AdminSeoCapabilities } from "@/types/admin-seo";

type Props = {
  data: SeoDashboardData;
  capabilities: AdminSeoCapabilities;
};

export function AdminSeoDashboardPage({ data, capabilities }: Props) {
  const { stats, findings } = data;
  const topFindings = findings.slice(0, 5);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">SEO Control Panel</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Quản trị index/noindex, metadata templates và audit — không cần sửa code.
        </p>
      </header>

      {data.error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {data.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng rules" tone="neutral" value={stats.totalRules} />
        <StatCard label="Index" tone="ok" value={stats.indexableRules} />
        <StatCard label="Noindex" tone="warn" value={stats.noindexRules} />
        <StatCard label="Cảnh báo audit" tone="alert" value={stats.auditFindings} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <h2 className="text-lg font-semibold text-zinc-100">Shortcuts</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {capabilities.canViewRules ? (
              <Shortcut href="/admin/seo/rules" label="Quản lý rules" tone="cyan" />
            ) : null}
            {capabilities.canViewAudit ? (
              <Shortcut href="/admin/seo/audit" label="SEO audit" tone="violet" />
            ) : null}
            <Shortcut external href="/sitemap.xml" label="Sitemap" tone="emerald" />
            <Shortcut external href="/robots.txt" label="Robots" tone="emerald" />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <h2 className="text-lg font-semibold text-zinc-100">Audit summary</h2>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <dt className="text-xs text-red-200/80">Critical</dt>
              <dd className="text-2xl font-semibold text-red-100">{stats.criticalFindings}</dd>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
              <dt className="text-xs text-amber-200/80">Warning/Error</dt>
              <dd className="text-2xl font-semibold text-amber-100">{stats.warningFindings}</dd>
            </div>
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
              <dt className="text-xs text-emerald-200/80">OK</dt>
              <dd className="text-2xl font-semibold text-emerald-100">
                {stats.auditFindings === 0 ? "✓" : "—"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-100">Cảnh báo gần đây</h2>
          {capabilities.canViewAudit ? (
            <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin/seo/audit">
              Xem tất cả →
            </Link>
          ) : null}
        </div>
        {topFindings.length === 0 ? (
          <p className={`mt-4 rounded-xl border px-4 py-3 text-sm ${AUDIT_SEVERITY_STYLES.ok}`}>
            Không có cảnh báo — cấu hình SEO ổn.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {topFindings.map((item) => (
              <li
                className={`rounded-xl border px-4 py-3 text-sm ${AUDIT_SEVERITY_STYLES[item.severity]}`}
                key={item.id}
              >
                <span className="text-xs font-semibold uppercase">{item.severity}</span>
                <p className="mt-1 font-medium">{item.route}</p>
                <p className="text-zinc-300">{item.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "neutral" | "ok" | "warn" | "alert";
}) {
  const tones = {
    neutral: "border-white/10 bg-zinc-950/80 text-zinc-100",
    ok: "border-emerald-400/20 bg-emerald-400/5 text-emerald-100",
    warn: "border-amber-400/20 bg-amber-400/5 text-amber-100",
    alert: "border-red-400/20 bg-red-400/5 text-red-100"
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Shortcut({
  href,
  label,
  tone,
  external
}: {
  href: string;
  label: string;
  tone: "cyan" | "violet" | "emerald";
  external?: boolean;
}) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-400/5 text-cyan-100 hover:bg-cyan-400/10",
    violet: "border-violet-400/20 bg-violet-400/5 text-violet-100 hover:bg-violet-400/10",
    emerald: "border-emerald-400/20 bg-emerald-400/5 text-emerald-100 hover:bg-emerald-400/10"
  };

  const className = `block rounded-xl border px-4 py-3 text-sm font-semibold transition ${tones[tone]}`;

  if (external) {
    return (
      <a className={className} href={href} rel="noopener noreferrer" target="_blank">
        {label} ↗
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {label}
    </Link>
  );
}
