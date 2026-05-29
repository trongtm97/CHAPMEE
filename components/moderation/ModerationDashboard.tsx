"use client";

import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { processReportModerationAction } from "@/lib/moderation/apply-action";
import { correctStoryAgeRatingAction } from "@/lib/moderation/correct-story-age-rating";
import { reviewAppealAction } from "@/lib/moderation/review-appeal";
import {
  AGE_RATING_OPTIONS,
  MODERATOR_ACTION_OPTIONS
} from "@/lib/moderation/moderation-rules";
import type {
  ModerationAppealRow,
  ModerationReportRow
} from "@/lib/moderation/get-moderation-queue";
import { ReporterQualityPanel } from "@/components/moderation/ReporterQualityPanel";
import { REPORT_REASON_OPTIONS } from "@/lib/moderation/moderation-rules";
import { reasonCodeToPolicyArea } from "@/lib/moderation/moderation-rules";

type ModerationDashboardProps = {
  pendingReports: ModerationReportRow[];
  reviewingReports: ModerationReportRow[];
  resolvedReports: ModerationReportRow[];
  copyrightReports: ModerationReportRow[];
  appeals: ModerationAppealRow[];
};

const tabs = [
  { id: "pending", label: "Báo cáo mới" },
  { id: "reviewing", label: "Đang xem xét" },
  { id: "resolved", label: "Đã xử lý" },
  { id: "appeals", label: "Khiếu nại" },
  { id: "copyright", label: "Bản quyền" }
] as const;

type TabId = (typeof tabs)[number]["id"];

function reasonLabel(code: string) {
  return REPORT_REASON_OPTIONS.find((r) => r.value === code)?.label ?? code;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export function ModerationDashboard({
  appeals,
  copyrightReports,
  pendingReports,
  resolvedReports,
  reviewingReports
}: ModerationDashboardProps) {
  const [tab, setTab] = useState<TabId>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(
    pendingReports[0]?.id ?? null
  );

  const lists: Record<TabId, ModerationReportRow[]> = {
    pending: pendingReports,
    reviewing: reviewingReports,
    resolved: resolvedReports.slice(0, 30),
    appeals: [],
    copyright: copyrightReports
  };

  const activeList = tab === "appeals" ? [] : lists[tab];
  const selected =
    activeList.find((r) => r.id === selectedId) ?? activeList[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
            variant={tab === item.id ? "primary" : "secondary"}
          >
            {item.label}
            {item.id === "pending" && pendingReports.length > 0
              ? ` (${pendingReports.length})`
              : ""}
            {item.id === "appeals" && appeals.length > 0
              ? ` (${appeals.length})`
              : ""}
          </Button>
        ))}
      </div>

      {tab === "appeals" ? (
        <div className="space-y-3">
          {appeals.length === 0 ? (
            <Card className="p-4 text-sm text-zinc-400">Không có khiếu nại đang chờ.</Card>
          ) : (
            appeals.map((appeal) => (
              <Card className="space-y-3 p-4" key={appeal.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">
                    {appeal.userName ?? appeal.userId}
                  </p>
                  <Badge>{appeal.status}</Badge>
                </div>
                <p className="text-sm leading-6 text-zinc-300">{appeal.message}</p>
                <p className="text-xs text-zinc-500">{formatDate(appeal.createdAt)}</p>
                <div className="flex flex-wrap gap-2">
                  <form action={reviewAppealAction}>
                    <input name="appeal_id" type="hidden" value={appeal.id} />
                    <input name="decision" type="hidden" value="accepted" />
                    <Button type="submit" variant="primary">
                      Chấp nhận
                    </Button>
                  </form>
                  <form action={reviewAppealAction}>
                    <input name="appeal_id" type="hidden" value={appeal.id} />
                    <input name="decision" type="hidden" value="rejected" />
                    <Button type="submit" variant="secondary">
                      Từ chối
                    </Button>
                  </form>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-2">
            {activeList.length === 0 ? (
              <Card className="p-4 text-sm text-zinc-400">Danh sách trống.</Card>
            ) : (
              activeList.map((report) => (
                <button
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selected?.id === report.id
                      ? "border-cyan-300/40 bg-cyan-300/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                  key={report.id}
                  onClick={() => setSelectedId(report.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">
                      {report.targetType}
                    </span>
                    {report.priority === "high" ? (
                      <Badge variant="warning">Ưu tiên</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    {reasonLabel(report.reasonCode)}
                  </p>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {report.preview ?? report.targetId}
                  </p>
                </button>
              ))
            )}
          </div>

          {selected ? (
            <ReportDetailPanel report={selected} />
          ) : (
            <Card className="p-4 text-sm text-zinc-400">
              Chọn một báo cáo để xử lý.
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ReportDetailPanel({ report }: { report: ModerationReportRow }) {
  const policyArea = reasonCodeToPolicyArea(report.reasonCode);

  return (
    <Card className="space-y-4 p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-zinc-500">Chi tiết báo cáo</p>
        <h2 className="mt-1 text-lg font-bold text-white">
          {reasonLabel(report.reasonCode)}
        </h2>
        <p className="text-sm text-zinc-400">
          {report.targetType} · {formatDate(report.createdAt)}
        </p>
      </div>

      {report.preview ? (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-xs text-zinc-500">Xem trước nội dung</p>
          <p className="mt-1 text-sm leading-6 text-zinc-200">{report.preview}</p>
        </div>
      ) : null}

      {report.reasonDetail ? (
        <p className="text-sm leading-6 text-zinc-300">
          <span className="text-zinc-500">Ghi chú người báo cáo: </span>
          {report.reasonDetail}
        </p>
      ) : null}

      {report.metadata?.original_work_url ? (
        <p className="text-sm text-cyan-300">
          Tác phẩm gốc: {String(report.metadata.original_work_url)}
        </p>
      ) : null}

      <ReporterQualityPanel
        quality={report.reporterQuality}
        reportId={report.id}
        reporterId={report.reporterId}
        reporterName={report.reporterName}
      />

      {report.targetType === "story" &&
      report.reasonCode === "wrong_age_rating" &&
      report.reportedUserId ? (
        <form
          action={correctStoryAgeRatingAction}
          className="space-y-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3"
        >
          <p className="text-sm font-medium text-cyan-100">
            Chỉnh phân loại độ tuổi truyện
          </p>
          <input name="story_id" type="hidden" value={report.targetId} />
          <input name="report_id" type="hidden" value={report.id} />
          <input name="user_id" type="hidden" value={report.reportedUserId} />
          <select
            className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
            name="new_age_rating"
            required
          >
            {AGE_RATING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <textarea
            className="min-h-16 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
            name="note"
            placeholder="Ghi chú (tuỳ chọn). Từ 2 báo cáo sai phân loại trở lên có thể tạo cảnh cáo."
          />
          <Button className="w-full" type="submit" variant="secondary">
            Cập nhật phân loại
          </Button>
        </form>
      ) : null}

      {report.reportedUserId ? (
        <form action={processReportModerationAction} className="space-y-3 border-t border-white/10 pt-4">
          <input name="report_id" type="hidden" value={report.id} />
          <input name="user_id" type="hidden" value={report.reportedUserId} />
          <input name="target_type" type="hidden" value={report.targetType} />
          <input name="target_id" type="hidden" value={report.targetId} />
          <input name="policy_area" type="hidden" value={policyArea} />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-200">Hành động</span>
            <select
              className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
              name="action"
              required
            >
              {MODERATOR_ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              <option value="escalate">Chuyển cấp cao</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-200">Ghi chú nội bộ</span>
            <textarea
              className="min-h-20 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
              name="note"
              placeholder="Ghi chú cho audit log (tuỳ chọn)."
            />
          </label>
          <Button className="w-full" type="submit">
            Áp dụng xử lý
          </Button>
        </form>
      ) : (
        <p className="text-sm text-amber-200">
          Không xác định được chủ sở hữu nội dung. Cần tra cứu thủ công.
        </p>
      )}
    </Card>
  );
}
