import Link from "next/link";
import type { SeoOverrideRow } from "@/lib/db/schema/seo-center";
import {
  groupSeoPublicRoutePresets,
  type SeoPublicRoutePreset
} from "@/lib/seo/public-route-presets";

type SeoPublicPagesPanelProps = {
  overridesByPath: Map<string, SeoOverrideRow>;
  canUpdate: boolean;
};

function pipelineLabel(preset: SeoPublicRoutePreset) {
  if (preset.pipeline === "resolver") {
    return "Override + template";
  }
  if (preset.pipeline === "cms") {
    return "Content Hub";
  }
  return "Legacy rules";
}

function RouteRow({
  preset,
  override,
  canUpdate
}: {
  preset: SeoPublicRoutePreset;
  override?: SeoOverrideRow;
  canUpdate: boolean;
}) {
  const editHref = override
    ? `/admin/seo/overrides/${override.id}`
    : `/admin/seo/overrides/new?path=${encodeURIComponent(preset.path)}`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-zinc-100">{preset.label}</p>
          <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-cyan-200/90">{preset.path}</code>
          {override ? (
            <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
              Đã override
            </span>
          ) : preset.supportsOverride ? (
            <span className="rounded-full bg-zinc-700/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Mặc định
            </span>
          ) : (
            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
              {pipelineLabel(preset)}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">{preset.description}</p>
        {override?.title ? (
          <p className="mt-2 truncate text-sm text-zinc-300">
            <span className="text-zinc-500">Title:</span> {override.title}
          </p>
        ) : null}
        {override?.metaDescription ? (
          <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
            <span className="text-zinc-500">Description:</span> {override.metaDescription}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <a
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/[0.04]"
          href={preset.path}
          rel="noopener noreferrer"
          target="_blank"
        >
          Xem trang
        </a>
        {preset.supportsOverride && canUpdate ? (
          <Link
            className="rounded-lg bg-cyan-500/20 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30"
            href={editHref}
          >
            {override ? "Sửa SEO" : "Tùy chỉnh SEO"}
          </Link>
        ) : preset.pipeline === "cms" ? (
          <Link
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/[0.04]"
            href="/admin/pages"
          >
            Content Hub
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function SeoPublicPagesPanel({ overridesByPath, canUpdate }: SeoPublicPagesPanelProps) {
  const groups = groupSeoPublicRoutePresets();

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100/90">
        Chọn trang công khai để chỉnh <strong>Title</strong>, <strong>meta description</strong>,{" "}
        <strong>ảnh OG/Twitter</strong> và robots — tương tự RankMath. Trang truyện/chương/thể loại
        dùng Studio hoặc tab Taxonomy trong{" "}
        <Link className="underline" href="/admin/seo/control">
          Control Center
        </Link>
        .
      </div>

      {groups.map(({ group, items }) => (
        <section className="space-y-3" key={group}>
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-500">{group}</h2>
          <div className="space-y-3">
            {items.map((preset) => (
              <RouteRow
                canUpdate={canUpdate}
                key={preset.path}
                override={overridesByPath.get(preset.path)}
                preset={preset}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
