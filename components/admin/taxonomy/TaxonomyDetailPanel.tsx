"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";
import { taxonomyTermPublicUrl } from "@/lib/taxonomy/public-url";
import type { TaxonomyTermAdminRow } from "@/lib/taxonomy/admin-data";

type TaxonomyDetailPanelProps = {
  term: TaxonomyTermAdminRow | null;
  onEdit: (term: TaxonomyTermAdminRow) => void;
  onToggle: (term: TaxonomyTermAdminRow) => void;
  onMerge: (term: TaxonomyTermAdminRow) => void;
  onViewStories: (term: TaxonomyTermAdminRow) => void;
  onViewAudit: () => void;
};

function deriveStatus(term: TaxonomyTermAdminRow) {
  if (term.is_active) return { label: "Active", className: "text-emerald-300 bg-emerald-400/10" };
  if (term.usage_count > 0) {
    return { label: "Deprecated", className: "text-amber-300 bg-amber-400/10" };
  }
  return { label: "Disabled", className: "text-zinc-400 bg-white/5" };
}

function FlagRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className={on ? "text-emerald-400" : "text-zinc-600"}>{on ? "Có" : "Không"}</span>
    </div>
  );
}

export function TaxonomyDetailPanel({
  term,
  onEdit,
  onToggle,
  onMerge,
  onViewStories,
  onViewAudit
}: TaxonomyDetailPanelProps) {
  if (!term) {
    return (
      <aside className="rounded-xl border border-white/10 bg-zinc-950/40 p-5">
        <h3 className="text-sm font-semibold text-white">Chi tiết taxonomy</h3>
        <p className="mt-3 text-sm text-zinc-500">
          Chọn một dòng trong bảng để xem nhanh thông tin, cờ cấu hình và hành động.
        </p>
        <ul className="mt-4 space-y-2 text-xs text-zinc-500">
          <li>• Không xóa cứng taxonomy đã có usage</li>
          <li>• Gộp thay vì xóa khi trùng nghĩa</li>
          <li>• Creator chỉ thấy taxonomy active + selectable</li>
        </ul>
      </aside>
    );
  }

  const status = deriveStatus(term);
  const publicUrl = taxonomyTermPublicUrl(term.type, term.slug, term.is_public);

  return (
    <aside className="rounded-xl border border-white/10 bg-zinc-950/40 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500">{TAXONOMY_TYPE_LABELS[term.type]}</p>
          <h3 className="mt-0.5 truncate text-base font-semibold text-white">{term.name}</h3>
          <p className="mt-1 font-mono text-xs text-zinc-500">{term.slug}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${status.className}`}>
          {status.label}
        </span>
      </div>

      {term.description ? (
        <p className="mt-3 line-clamp-3 text-sm text-zinc-400">{term.description}</p>
      ) : null}

      <div className="mt-4 space-y-1.5 rounded-lg border border-white/5 bg-black/20 p-3">
        <FlagRow label="Creator chọn được" on={term.is_selectable_by_creator} />
        <FlagRow label="Discover" on={term.use_for_discover} />
        <FlagRow label="SEO" on={term.use_for_seo} />
        <FlagRow label="Ranking" on={term.use_for_ranking} />
        <FlagRow label="Moderation" on={term.use_for_moderation} />
        {term.type === "presentation_mode" ? (
          <FlagRow label="Composer format" on={term.is_active} />
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-zinc-500">Usage</dt>
          <dd className="font-semibold text-white">{term.usage_count}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Thứ tự</dt>
          <dd className="font-semibold text-white">{term.sort_order}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500">Cập nhật</dt>
          <dd className="text-zinc-300">
            {new Date(term.updated_at).toLocaleString("vi-VN")}
          </dd>
        </div>
      </dl>

      {term.aliases.length > 0 ? (
        <p className="mt-3 text-xs text-zinc-500">
          Alias: {term.aliases.join(", ")}
        </p>
      ) : null}

      {publicUrl ? (
        <Link
          className="mt-3 inline-block text-xs text-cyan-300 hover:underline"
          href={publicUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Xem landing page ↗
        </Link>
      ) : null}

      {term.type === "presentation_mode" ? (
        <Link
          className="mt-2 block text-xs text-violet-300 hover:underline"
          href="/admin/story-formats"
        >
          Mở Composer settings ↗
        </Link>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => onEdit(term)} type="button">
          Sửa
        </Button>
        <Button onClick={() => onToggle(term)} type="button" variant="secondary">
          {term.is_active ? "Tắt" : "Bật"}
        </Button>
        <Button onClick={() => onMerge(term)} type="button" variant="secondary">
          Gộp
        </Button>
        <Button onClick={() => onViewStories(term)} type="button" variant="secondary">
          Truyện
        </Button>
        <Button onClick={onViewAudit} type="button" variant="secondary">
          Lịch sử
        </Button>
      </div>
    </aside>
  );
}
