"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui";
import type {
  TaxonomyQualityFilterOptions,
  TaxonomyQualityFlagStatus,
  TaxonomyQualityFlagType,
  TaxonomyQualitySeverity
} from "@/types/content-taxonomy-quality";

export type TaxonomyQualityFilterState = {
  flagType: TaxonomyQualityFlagType | "all";
  severity: TaxonomyQualitySeverity | "all";
  status: TaxonomyQualityFlagStatus | "all";
  author: string;
  mainGenre: string;
  importJob: string;
  hasUserReports: boolean;
};

type Props = {
  options: TaxonomyQualityFilterOptions;
  initial: Partial<TaxonomyQualityFilterState>;
};

export function TaxonomyQualityFilters({ options, initial }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<TaxonomyQualityFilterState>({
    flagType: initial.flagType ?? "all",
    severity: initial.severity ?? "all",
    status: initial.status ?? "all",
    author: initial.author ?? "",
    mainGenre: initial.mainGenre ?? "",
    importJob: initial.importJob ?? "",
    hasUserReports: initial.hasUserReports ?? false
  });

  const apply = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (state.flagType !== "all") params.set("flag_type", state.flagType);
    else params.delete("flag_type");
    if (state.severity !== "all") params.set("severity", state.severity);
    else params.delete("severity");
    if (state.status !== "all") params.set("status", state.status);
    else params.delete("status");
    if (state.author.trim()) params.set("author", state.author.trim());
    else params.delete("author");
    if (state.mainGenre) params.set("main_genre", state.mainGenre);
    else params.delete("main_genre");
    if (state.importJob) params.set("import_job", state.importJob);
    else params.delete("import_job");
    if (state.hasUserReports) params.set("reports", "1");
    else params.delete("reports");
    router.push(`?${params.toString()}`);
  }, [router, searchParams, state]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-sm font-semibold text-white">Bộ lọc</p>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-zinc-400">
          Loại flag
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-white"
            onChange={(e) =>
              setState((s) => ({
                ...s,
                flagType: e.target.value as TaxonomyQualityFilterState["flagType"]
              }))
            }
            value={state.flagType}
          >
            <option value="all">Tất cả</option>
            <option value="missing_required">Thiếu bắt buộc</option>
            <option value="too_many_tags">Quá nhiều tag</option>
            <option value="hot_tag_abuse">Lạm dụng tag hot</option>
            <option value="conflicting_taxonomy">Mâu thuẫn</option>
            <option value="missing_warning">Thiếu cảnh báo</option>
            <option value="user_reported_wrong_tag">Report sai tag</option>
            <option value="taxonomy_behavior_mismatch">Hành vi không khớp tag</option>
            <option value="import_error">Import lỗi</option>
            <option value="admin_manual">Admin thủ công</option>
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Mức độ
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-white"
            onChange={(e) =>
              setState((s) => ({
                ...s,
                severity: e.target.value as TaxonomyQualityFilterState["severity"]
              }))
            }
            value={state.severity}
          >
            <option value="all">Tất cả</option>
            <option value="low">Thấp</option>
            <option value="medium">Trung bình</option>
            <option value="high">Cao</option>
            <option value="critical">Nghiêm trọng</option>
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Trạng thái
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-white"
            onChange={(e) =>
              setState((s) => ({
                ...s,
                status: e.target.value as TaxonomyQualityFilterState["status"]
              }))
            }
            value={state.status}
          >
            <option value="all">Tất cả</option>
            <option value="open">Mở</option>
            <option value="reviewing">Đang rà soát</option>
            <option value="sent_to_creator">Đã gửi tác giả</option>
            <option value="resolved">Đã xử lý</option>
            <option value="dismissed">Bỏ qua</option>
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Thể loại chính
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-white"
            onChange={(e) => setState((s) => ({ ...s, mainGenre: e.target.value }))}
            value={state.mainGenre}
          >
            <option value="">Tất cả</option>
            {options.mainGenres.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Tác giả (username/tên)
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-white"
            onChange={(e) => setState((s) => ({ ...s, author: e.target.value }))}
            placeholder="username hoặc tên hiển thị"
            value={state.author}
          />
        </label>
        <label className="text-xs text-zinc-400">
          Import job
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-white"
            onChange={(e) => setState((s) => ({ ...s, importJob: e.target.value }))}
            value={state.importJob}
          >
            <option value="">Tất cả</option>
            {options.recentImportJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 text-sm text-zinc-300">
          <input
            checked={state.hasUserReports}
            onChange={(e) =>
              setState((s) => ({ ...s, hasUserReports: e.target.checked }))
            }
            type="checkbox"
          />
          Có report độc giả
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <Button onClick={apply} type="button">
          Áp dụng
        </Button>
        <Button
          onClick={() => {
            setState({
              flagType: "all",
              severity: "all",
              status: "all",
              author: "",
              mainGenre: "",
              importJob: "",
              hasUserReports: false
            });
            const params = new URLSearchParams(searchParams.toString());
            ["flag_type", "severity", "status", "author", "main_genre", "import_job", "reports", "page"].forEach(
              (k) => params.delete(k)
            );
            router.push(`?${params.toString()}`);
          }}
          type="button"
          variant="secondary"
        >
          Xóa lọc
        </Button>
      </div>
    </div>
  );
}
