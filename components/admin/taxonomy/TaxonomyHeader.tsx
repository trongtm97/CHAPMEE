"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import {
  TAXONOMY_ANALYTICS_HREF,
  TAXONOMY_CONTENT_QUALITY_HREF,
  TAXONOMY_TEMPLATES_TAB
} from "@/lib/taxonomy/admin-tabs";

type TaxonomyHeaderProps = {
  pendingRequests: number;
  onAddTaxonomy: () => void;
  onImportExport: () => void;
  onPendingRequests: () => void;
  onQuickImport: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onOpenTemplates: () => void;
  pending?: boolean;
};

export function TaxonomyHeader({
  pendingRequests,
  onAddTaxonomy,
  onImportExport,
  onPendingRequests,
  onQuickImport,
  onExportCsv,
  onExportJson,
  onOpenTemplates,
  pending
}: TaxonomyHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300/80">
          Taxonomy Control Center
        </p>
        <h1 className="mt-0.5 text-xl font-bold text-white sm:text-2xl">Quản lý taxonomy</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Chuẩn hóa loại nội dung, thể loại, tag, format trình bày và cảnh báo nội dung trên
          ChapMee.
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button disabled={pending} onClick={onAddTaxonomy} type="button">
          Thêm taxonomy
        </Button>
        <Button disabled={pending} onClick={onImportExport} type="button" variant="secondary">
          Nhập / Xuất
        </Button>
        <Button disabled={pending} onClick={onPendingRequests} type="button" variant="secondary">
          Yêu cầu chờ duyệt
          {pendingRequests > 0 ? ` (${pendingRequests})` : ""}
        </Button>

        <div className="relative" ref={menuRef}>
          <Button
            disabled={pending}
            onClick={() => setMenuOpen((v) => !v)}
            type="button"
            variant="secondary"
          >
            Tác vụ khác ▾
          </Button>
          {menuOpen ? (
            <div className="absolute right-0 z-30 mt-1 min-w-[220px] rounded-xl border border-white/10 bg-zinc-950 py-1 shadow-xl">
              <button
                className="block w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
                onClick={() => {
                  setMenuOpen(false);
                  onQuickImport();
                }}
                type="button"
              >
                Nhập nhanh (modal)
              </button>
              <button
                className="block w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
                onClick={() => {
                  setMenuOpen(false);
                  onExportCsv();
                }}
                type="button"
              >
                Xuất CSV
              </button>
              <button
                className="block w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
                onClick={() => {
                  setMenuOpen(false);
                  onExportJson();
                }}
                type="button"
                >
                Xuất JSON
              </button>
              <button
                className="block w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenTemplates();
                }}
                type="button"
              >
                Template trình bày
              </button>
              <Link
                className="block px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
                href="/admin/taxonomy/unmapped"
                onClick={() => setMenuOpen(false)}
              >
                Legacy chưa map
              </Link>
              <Link
                className="block px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
                href={TAXONOMY_ANALYTICS_HREF}
                onClick={() => setMenuOpen(false)}
              >
                Phân tích taxonomy
              </Link>
              <Link
                className="block px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
                href={TAXONOMY_CONTENT_QUALITY_HREF}
                onClick={() => setMenuOpen(false)}
              >
                Chất lượng truyện (story-level)
              </Link>
              <Link
                className="block px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
                href={`/admin/taxonomy?tab=${TAXONOMY_TEMPLATES_TAB}`}
                onClick={() => setMenuOpen(false)}
              >
                Composer format templates
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
