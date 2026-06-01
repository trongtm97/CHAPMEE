"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AUDIT_SEVERITY_STYLES } from "@/components/admin/seo/SeoBadges";
import { runSeoAuditAction } from "@/lib/admin/seo-audit-actions";
import type { SeoAuditFinding } from "@/lib/seo/audit";
import type { AdminSeoCapabilities } from "@/types/admin-seo";

type Props = {
  findings: SeoAuditFinding[];
  capabilities: AdminSeoCapabilities;
  pending?: boolean;
  onRefresh: () => void;
  onToast: (message: string) => void;
};

const ISSUE_LABELS: Record<string, string> = {
  private_route_indexable: "Route private đang index",
  missing_seo_title: "Thiếu SEO title",
  missing_seo_description: "Thiếu SEO description",
  missing_description: "Thiếu mô tả",
  invalid_slug: "Slug không hợp lệ",
  invalid_chapter_slug: "Slug chương không hợp lệ",
  duplicate_slug: "Slug trùng",
  missing_canonical: "Thiếu canonical",
  announcement_indexable_not_published: "Thông báo chưa publish nhưng index",
  multiple_h1: "Nhiều hơn 1 H1",
  missing_h1: "Thiếu H1"
};

const PAGE_SIZE = 25;

export function SeoAuditTab({ findings, capabilities, onRefresh, onToast }: Props) {
  const [items, setItems] = useState(findings);
  const [severity, setSeverity] = useState<"all" | SeoAuditFinding["severity"]>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let list = items;
    if (severity !== "all") list = list.filter((item) => item.severity === severity);
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (item) =>
          item.route.toLowerCase().includes(term) ||
          item.issue_type.toLowerCase().includes(term) ||
          item.message.toLowerCase().includes(term)
      );
    }
    return list;
  }, [items, severity, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleRerun() {
    startTransition(async () => {
      const result = await runSeoAuditAction();
      if (result.error) {
        onToast(result.error);
        return;
      }
      setItems(result.findings);
      onToast(`Đã quét ${result.findings.length} vấn đề.`);
      onRefresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          Kiểm tra cấu hình SEO, metadata và rule — không crawler DOM đầy đủ ở MVP.
        </p>
        {capabilities.canRunAudit ? (
          <button
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
            disabled={pending}
            onClick={handleRerun}
            type="button"
          >
            {pending ? "Đang quét…" : "Chạy lại audit"}
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 lg:grid-cols-3">
        <label className="space-y-1 lg:col-span-2">
          <span className="text-xs text-zinc-500">Tìm route / issue</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="/truyen, missing_title..."
            value={search}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-zinc-500">Mức độ</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(event) => {
              setSeverity(event.target.value as typeof severity);
              setPage(1);
            }}
            value={severity}
          >
            <option value="all">Tất cả</option>
            <option value="critical">Lỗi nghiêm trọng</option>
            <option value="error">Lỗi</option>
            <option value="warning">Cảnh báo</option>
            <option value="info">Thông tin</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className={`rounded-xl border px-6 py-10 text-center text-sm ${AUDIT_SEVERITY_STYLES.ok}`}>
          Không có vấn đề SEO — cấu hình ổn.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-[900px] w-full divide-y divide-white/10 text-sm">
            <thead className="bg-zinc-950/80 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-3">Mức độ</th>
                <th className="px-3 py-3">Route</th>
                <th className="px-3 py-3">Vấn đề</th>
                <th className="px-3 py-3">Khuyến nghị</th>
                <th className="px-3 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-zinc-950/40 text-zinc-200">
              {pageItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${AUDIT_SEVERITY_STYLES[item.severity]}`}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-cyan-100">{item.route}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{ISSUE_LABELS[item.issue_type] ?? item.issue_type}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{item.message}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-400">
                    {item.severity === "critical" ? "Sửa rule hoặc tắt index ngay." : "Xem tab Quy tắc SEO / Mẫu metadata."}
                  </td>
                  <td className="px-3 py-3">
                    <Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-200" href="/admin/seo?tab=rules">
                      Mở rule
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="flex justify-end gap-2">
          <button
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            type="button"
          >
            Trước
          </button>
          <button
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
            type="button"
          >
            Sau
          </button>
        </div>
      ) : null}
    </div>
  );
}
