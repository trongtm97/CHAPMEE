"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  TaxonomyMultiPicker,
  TaxonomySinglePicker
} from "@/components/studio/taxonomy/TaxonomyFieldPickers";
import { Button } from "@/components/ui";
import {
  adminEditStoryTaxonomyAction,
  createManualTaxonomyQualityFlagAction,
  reviewCreatorTaxonomyRevisionAction,
  runTaxonomyQualityCheckAction,
  sendCreatorTaxonomyRevisionRequestAction,
  updateTaxonomyQualityFlagStatusAction,
  updateTaxonomyQualityRuleAction
} from "@/lib/admin/content-taxonomy-quality-actions";
import { TaxonomyQualityFilters } from "@/components/admin/TaxonomyQualityFilters";
import { TaxonomyQualityRuleConfigEditor } from "@/components/admin/TaxonomyQualityRuleConfigEditor";
import { FLAG_TYPE_LABELS } from "@/lib/content-taxonomy-quality/labels";
import type {
  TaxonomyQualityAdminTab,
  TaxonomyQualityFlagRow,
  TaxonomyQualityFlagStatus,
  TaxonomyQualityFlagType,
  TaxonomyQualityPageData,
  TaxonomyQualityRuleRow,
  TaxonomyQualitySeverity
} from "@/types/content-taxonomy-quality";
import type { StoryFormTaxonomyBundle } from "@/lib/creator/get-story-form-taxonomy";
import type { TaxonomyType } from "@/types/taxonomy";

const TABS: Array<{ id: TaxonomyQualityAdminTab; label: string }> = [
  { id: "overview", label: "Tổng quan" },
  { id: "stories", label: "Truyện cần rà soát" },
  { id: "hot_tags", label: "Tag bị lạm dụng" },
  { id: "missing_warnings", label: "Thiếu cảnh báo" },
  { id: "import_errors", label: "Import lỗi" },
  { id: "revision_requests", label: "Yêu cầu tác giả" },
  { id: "rules", label: "Rule & cấu hình" }
];

type AdminStoryTaxonomyEditBundle =
  | {
      ok: true;
      story: {
        id: string;
        title: string;
        slug: string;
        contentWarningsConfirmed: boolean;
      };
      taxonomy: StoryFormTaxonomyBundle;
    }
  | { ok: false; error: string };

type Props = {
  data: TaxonomyQualityPageData;
  activeTab: TaxonomyQualityAdminTab;
  editBundle?: AdminStoryTaxonomyEditBundle | null;
  editFlagId?: string;
  filterInitial?: {
    flagType?: TaxonomyQualityFlagType | "all";
    severity?: TaxonomyQualitySeverity | "all";
    status?: TaxonomyQualityFlagStatus | "all";
    author?: string;
    mainGenre?: string;
    importJob?: string;
    hasUserReports?: boolean;
  };
};

export function AdminContentTaxonomyQualityPage({
  data,
  activeTab,
  editBundle,
  editFlagId,
  filterInitial
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [revisionReason, setRevisionReason] = useState("");
  const [editNote, setEditNote] = useState("");
  const [manualStoryRef, setManualStoryRef] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [manualSeverity, setManualSeverity] =
    useState<TaxonomyQualitySeverity>("medium");
  const [selections, setSelections] = useState<
    Partial<Record<TaxonomyType, string[]>>
  >(editBundle?.ok ? editBundle.taxonomy.selectedByType : {});
  const [presentationMode, setPresentationMode] = useState(
    editBundle?.ok ? editBundle.taxonomy.presentationMode ?? "" : ""
  );
  const [warningsConfirmed, setWarningsConfirmed] = useState(
    editBundle?.ok ? editBundle.taxonomy.contentWarningsConfirmed : false
  );

  const setTab = useCallback(
    (tab: TaxonomyQualityAdminTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      params.delete("edit");
      params.delete("flag");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }

  function openEdit(flag: TaxonomyQualityFlagRow) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("edit", flag.storyId);
    params.set("flag", flag.id);
    router.push(`?${params.toString()}`);
  }

  function runBatchCheck() {
    startTransition(async () => {
      const result = await runTaxonomyQualityCheckAction({ batchLimit: 200 });
      if (!result.ok) {
        showToast(result.error ?? "Lỗi chạy kiểm tra.");
        return;
      }
      showToast("Đã chạy kiểm tra batch (200 truyện).");
      router.refresh();
    });
  }

  function navigateWithFilters(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  function submitManualFlag() {
    if (!manualStoryRef.trim() || !manualReason.trim()) {
      showToast("Nhập slug/ID truyện và lý do.");
      return;
    }
    startTransition(async () => {
      const result = await createManualTaxonomyQualityFlagAction({
        storyIdOrSlug: manualStoryRef.trim(),
        reason: manualReason.trim(),
        severity: manualSeverity
      });
      if (!result.ok) {
        showToast(result.error ?? "Không tạo được flag.");
        return;
      }
      showToast("Đã gắn flag thủ công.");
      setManualStoryRef("");
      setManualReason("");
      router.refresh();
    });
  }

  function handleFlagAction(
    flagId: string,
    status: "resolved" | "dismissed" | "reviewing"
  ) {
    startTransition(async () => {
      const result = await updateTaxonomyQualityFlagStatusAction({ flagId, status });
      if (!result.ok) {
        showToast(result.error ?? "Không cập nhật được flag.");
        return;
      }
      showToast("Đã cập nhật flag.");
      router.refresh();
    });
  }

  function handleSaveTaxonomy() {
    if (!editBundle?.ok || !editNote.trim()) {
      showToast("Nhập lý do sửa taxonomy.");
      return;
    }
    startTransition(async () => {
      const result = await adminEditStoryTaxonomyAction({
        storyId: editBundle.story.id,
        flagId: editFlagId,
        note: editNote.trim(),
        presentationMode: selections.presentation_mode?.[0] || presentationMode || undefined,
        contentWarningsConfirmed: warningsConfirmed,
        selections,
        resolveFlag: true
      });
      if (!result.ok) {
        showToast(result.error ?? "Không lưu được taxonomy.");
        return;
      }
      showToast("Đã lưu taxonomy và resolve flag.");
      const params = new URLSearchParams(searchParams.toString());
      params.delete("edit");
      params.delete("flag");
      router.push(`?${params.toString()}`);
      router.refresh();
    });
  }

  function handleSendRevision(flag: TaxonomyQualityFlagRow) {
    if (!revisionReason.trim()) {
      showToast("Nhập lý do yêu cầu tác giả chỉnh sửa.");
      return;
    }
    startTransition(async () => {
      const result = await sendCreatorTaxonomyRevisionRequestAction({
        storyId: flag.storyId,
        creatorId: flag.authorId,
        reason: revisionReason.trim(),
        flagId: flag.id,
        requiredChanges: { flagType: flag.flagType, reason: flag.reason }
      });
      if (!result.ok) {
        showToast(result.error ?? "Không gửi được yêu cầu.");
        return;
      }
      showToast("Đã gửi yêu cầu tác giả chỉnh phân loại.");
      setRevisionReason("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {toast}
        </p>
      ) : null}

      {data.error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {data.error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Thiếu phân loại bắt buộc"
          onClick={() =>
            navigateWithFilters({ tab: "stories", flag_type: "missing_required" })
          }
          value={data.summary.missingRequired}
        />
        <SummaryCard
          label="Nghi sai thể loại"
          onClick={() =>
            navigateWithFilters({ tab: "stories", flag_type: "conflicting_taxonomy" })
          }
          value={data.summary.wrongGenre}
        />
        <SummaryCard
          label="Lạm dụng tag"
          onClick={() => setTab("hot_tags")}
          value={data.summary.tagAbuse}
        />
        <SummaryCard
          label="Thiếu cảnh báo"
          onClick={() => setTab("missing_warnings")}
          value={data.summary.missingWarning}
        />
        <SummaryCard
          label="Report sai tag"
          onClick={() =>
            navigateWithFilters({ tab: "stories", flag_type: "user_reported_wrong_tag" })
          }
          value={data.summary.userReported}
        />
        <SummaryCard
          label="Usage bất thường"
          onClick={() =>
            navigateWithFilters({ tab: "stories", flag_type: "too_many_tags" })
          }
          value={data.summary.abnormalUsage}
        />
        <SummaryCard
          label="Yêu cầu tác giả đang mở"
          onClick={() => setTab("revision_requests")}
          value={data.summary.openRevisionRequests}
        />
      </div>

      {activeTab === "overview" || activeTab === "rules" ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-sm font-semibold text-white">Gắn flag thủ công</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Dùng khi moderator phát hiện sai phân loại nhưng rule engine chưa bắt.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(e) => setManualStoryRef(e.target.value)}
              placeholder="Slug hoặc ID truyện"
              value={manualStoryRef}
            />
            <select
              className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(e) =>
                setManualSeverity(e.target.value as TaxonomyQualitySeverity)
              }
              value={manualSeverity}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <textarea
              className="sm:col-span-2 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white lg:col-span-2"
              onChange={(e) => setManualReason(e.target.value)}
              placeholder="Lý do flag (bắt buộc)"
              rows={2}
              value={manualReason}
            />
          </div>
          <Button
            className="mt-3"
            disabled={pending}
            onClick={submitManualFlag}
            type="button"
          >
            Tạo flag admin
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {TABS.map((tab) => (
          <button
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
            key={tab.id}
            onClick={() => setTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "rules" ? (
        <RulesPanel
          onRunCheck={runBatchCheck}
          onUpdateRule={(ruleId, patch) => {
            startTransition(async () => {
              const result = await updateTaxonomyQualityRuleAction({
                ruleId,
                ...patch
              });
              if (!result.ok) {
                showToast(result.error ?? "Không cập nhật rule.");
                return;
              }
              showToast("Đã cập nhật rule.");
              router.refresh();
            });
          }}
          pending={pending}
          rules={data.rules}
        />
      ) : null}

      {activeTab === "hot_tags" ? (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3">Tag</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3">Reports</th>
              </tr>
            </thead>
            <tbody>
              {data.hotTagAbuse.map((row) => (
                <tr className="border-t border-white/5" key={row.termId}>
                  <td className="px-4 py-3 text-white">{row.termName}</td>
                  <td className="px-4 py-3">{row.storyCount}</td>
                  <td className="px-4 py-3">{row.featured ? "Có" : "Không"}</td>
                  <td className="px-4 py-3">{row.reportCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {activeTab === "revision_requests" ? (
        <div className="space-y-3">
          {data.revisionRequests.length === 0 ? (
            <p className="text-sm text-zinc-400">Không có yêu cầu đang mở.</p>
          ) : (
            data.revisionRequests.map((req) => (
              <div
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                key={req.id}
              >
                <p className="font-semibold text-white">{req.storyTitle}</p>
                <p className="mt-1 text-sm text-zinc-400">{req.reason}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Trạng thái: {req.status}
                  {req.creatorSubmittedAt ? ` · Tác giả đã gửi ${req.creatorSubmittedAt}` : ""}
                </p>
                {req.status === "creator_submitted" ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          await reviewCreatorTaxonomyRevisionAction({
                            requestId: req.id,
                            status: "approved"
                          });
                          router.refresh();
                        });
                      }}
                    >
                      Duyệt
                    </Button>
                    <Button
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          await reviewCreatorTaxonomyRevisionAction({
                            requestId: req.id,
                            status: "rejected"
                          });
                          router.refresh();
                        });
                      }}
                      variant="secondary"
                    >
                      Từ chối
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {activeTab !== "rules" &&
      activeTab !== "hot_tags" &&
      activeTab !== "revision_requests" ? (
        <>
          <TaxonomyQualityFilters
            initial={{
              flagType: filterInitial?.flagType ?? "all",
              severity: filterInitial?.severity ?? "all",
              status: filterInitial?.status ?? "all",
              author: filterInitial?.author ?? "",
              mainGenre: filterInitial?.mainGenre ?? "",
              importJob: filterInitial?.importJob ?? "",
              hasUserReports: filterInitial?.hasUserReports ?? false
            }}
            options={data.filterOptions}
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-400">
              {data.flagsTotal} flag · trang {data.page}/{data.totalPages}
            </p>
            <Button disabled={pending} onClick={runBatchCheck} variant="secondary">
              Chạy kiểm tra lại (200 truyện)
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-left text-zinc-400">
                <tr>
                  <th className="px-3 py-3">Truyện</th>
                  <th className="px-3 py-3">Tác giả</th>
                  <th className="px-3 py-3">Thể loại</th>
                  <th className="px-3 py-3">Tags</th>
                  <th className="px-3 py-3">Tuổi</th>
                  <th className="px-3 py-3">Cảnh báo</th>
                  <th className="px-3 py-3">Flag</th>
                  <th className="px-3 py-3">Mức</th>
                  <th className="px-3 py-3">Trạng thái</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.flags.map((flag) => (
                  <tr className="border-t border-white/5 align-top" key={flag.id}>
                    <td className="px-3 py-3">
                      <Link
                        className="font-medium text-cyan-300 hover:text-cyan-200"
                        href={`/truyen/${flag.storySlug}`}
                        target="_blank"
                      >
                        {flag.storyTitle}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-zinc-300">{flag.authorName}</td>
                    <td className="px-3 py-3">{flag.mainGenre ?? "—"}</td>
                    <td className="px-3 py-3">{flag.tagCount}</td>
                    <td className="px-3 py-3">{flag.ageRating ?? "—"}</td>
                    <td className="px-3 py-3">{flag.warningStatus}</td>
                    <td className="px-3 py-3">
                      <p>{FLAG_TYPE_LABELS[flag.flagType] ?? flag.flagType}</p>
                      <p className="mt-1 text-xs text-zinc-500">{flag.reason}</p>
                    </td>
                    <td className="px-3 py-3">{flag.severity}</td>
                    <td className="px-3 py-3">{flag.status}</td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-[220px] flex-col gap-1">
                        <Link
                          className="text-xs text-cyan-300 hover:underline"
                          href={`/admin/content/stories/${flag.storyId}`}
                        >
                          Mở admin content
                        </Link>
                        <button
                          className="text-left text-xs text-cyan-300 hover:underline"
                          onClick={() => openEdit(flag)}
                          type="button"
                        >
                          Sửa taxonomy
                        </button>
                        <button
                          className="text-left text-xs text-amber-300 hover:underline"
                          disabled={pending}
                          onClick={() => handleSendRevision(flag)}
                          type="button"
                        >
                          Gửi yêu cầu tác giả
                        </button>
                        <button
                          className="text-left text-xs text-emerald-300 hover:underline"
                          disabled={pending}
                          onClick={() => handleFlagAction(flag.id, "resolved")}
                          type="button"
                        >
                          Đánh dấu đã xử lý
                        </button>
                        <button
                          className="text-left text-xs text-zinc-400 hover:underline"
                          disabled={pending}
                          onClick={() => handleFlagAction(flag.id, "dismissed")}
                          type="button"
                        >
                          Bỏ qua
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            onPage={(p) => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(p));
              router.push(`?${params.toString()}`);
            }}
            page={data.page}
            totalPages={data.totalPages}
          />
        </>
      ) : null}

      {editBundle?.ok ? (
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-5">
          <h3 className="text-lg font-semibold text-white">
            Sửa taxonomy: {editBundle.story.title}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Chỉ sửa phân loại/tag — không đụng structured_content hay Composer blocks.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {(
              [
                "content_type",
                "main_genre",
                "age_rating",
                "presentation_mode"
              ] as TaxonomyType[]
            ).map((type) => (
              <TaxonomySinglePicker
                key={type}
                onChange={(value) =>
                  setSelections((prev) => ({
                    ...prev,
                    [type]: value ? [value] : []
                  }))
                }
                required={["content_type", "main_genre", "age_rating", "presentation_mode"].includes(
                  type
                )}
                terms={editBundle.taxonomy.optionsByType[type] ?? []}
                type={type}
                value={selections[type]?.[0] ?? ""}
              />
            ))}
            {(
              [
                "subgenre",
                "trope_tag",
                "content_warning",
                "relationship_tag"
              ] as TaxonomyType[]
            ).map((type) => (
              <TaxonomyMultiPicker
                key={type}
                onChange={(ids) => setSelections((prev) => ({ ...prev, [type]: ids }))}
                selectedIds={selections[type] ?? []}
                terms={editBundle.taxonomy.optionsByType[type] ?? []}
                type={type}
              />
            ))}
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={warningsConfirmed}
              onChange={(e) => setWarningsConfirmed(e.target.checked)}
              type="checkbox"
            />
            Đã xác nhận cảnh báo nội dung
          </label>
          <textarea
            className="mt-4 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Lý do admin sửa taxonomy (bắt buộc)"
            rows={3}
            value={editNote}
          />
          <div className="mt-3 flex gap-2">
            <Button disabled={pending} onClick={handleSaveTaxonomy}>
              Lưu & resolve flag
            </Button>
            <Button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("edit");
                params.delete("flag");
                router.push(`?${params.toString()}`);
              }}
              variant="secondary"
            >
              Đóng
            </Button>
          </div>
        </div>
      ) : null}

      {activeTab === "stories" || activeTab === "overview" ? (
        <textarea
          className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
          onChange={(e) => setRevisionReason(e.target.value)}
          placeholder="Lý do gửi yêu cầu tác giả chỉnh phân loại (dùng khi bấm Gửi yêu cầu trên bảng)"
          rows={2}
          value={revisionReason}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  onClick
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </>
  );

  if (!onClick) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">{inner}</div>
    );
  }

  return (
    <button
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-cyan-400/40 hover:bg-white/[0.06]"
      onClick={onClick}
      type="button"
    >
      {inner}
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  onPage
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2">
      <Button disabled={page <= 1} onClick={() => onPage(page - 1)} variant="secondary">
        Trước
      </Button>
      <span className="text-sm text-zinc-400">
        {page} / {totalPages}
      </span>
      <Button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        variant="secondary"
      >
        Sau
      </Button>
    </div>
  );
}

function RulesPanel({
  rules,
  pending,
  onRunCheck,
  onUpdateRule
}: {
  rules: TaxonomyQualityRuleRow[];
  pending: boolean;
  onRunCheck: () => void;
  onUpdateRule: (
    ruleId: string,
    patch: { isEnabled?: boolean; config?: Record<string, unknown> }
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <Button disabled={pending} onClick={onRunCheck}>
        Chạy kiểm tra lại (batch 200 truyện)
      </Button>
      {rules.map((rule) => (
        <div
          className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          key={rule.id}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-white">{rule.name}</p>
              <p className="text-xs text-zinc-500">{rule.ruleKey}</p>
              {rule.description ? (
                <p className="mt-1 text-sm text-zinc-400">{rule.description}</p>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                checked={rule.isEnabled}
                onChange={(e) =>
                  onUpdateRule(rule.id, { isEnabled: e.target.checked })
                }
                type="checkbox"
              />
              Bật rule
            </label>
          </div>
          <TaxonomyQualityRuleConfigEditor
            disabled={pending}
            onSave={(config) => onUpdateRule(rule.id, { config })}
            rule={rule}
          />
        </div>
      ))}
    </div>
  );
}
