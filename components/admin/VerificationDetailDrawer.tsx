"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CreatorDetailDrawer } from "@/components/admin/creators/CreatorDetailDrawer";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";
import { AvatarFallback, Button } from "@/components/ui";
import { VerificationDocumentsTab } from "@/components/admin/VerificationDocumentsTab";
import { VerificationNotesTab } from "@/components/admin/VerificationNotesTab";
import { VerificationHistoryTab } from "@/components/admin/VerificationHistoryTab";
import { VerificationAuditLogTab } from "@/components/admin/VerificationAuditLogTab";
import { loadVerificationDetailAction } from "@/lib/admin/get-verification-detail";
import { logVerificationViewedAction } from "@/lib/admin/update-verification-status";
import {
  VERIFICATION_RISK_LABELS,
  type VerificationAdminCapabilities
} from "@/types/admin-verification";
import {
  VERIFICATION_SOURCE_LABELS,
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_TYPE_LABELS
} from "@/lib/verification/labels";
import type { VerificationDetail } from "@/types/admin-verification";
import type { VerificationActionType } from "@/types/admin-verification";

const TABS = [
  "overview",
  "profile",
  "request",
  "documents",
  "history",
  "activity",
  "notes",
  "audit"
] as const;

type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Tổng quan",
  profile: "Hồ sơ",
  request: "Yêu cầu",
  documents: "Giấy tờ",
  history: "Lịch sử xác thực",
  activity: "Hoạt động",
  notes: "Ghi chú nội bộ",
  audit: "Audit log"
};

type Props = {
  open: boolean;
  verificationId: string | null;
  capabilities: VerificationAdminCapabilities;
  onClose: () => void;
  onAction: (action: VerificationActionType) => void;
  onRefresh: () => void;
};

export function VerificationDetailDrawer({
  open,
  verificationId,
  capabilities,
  onClose,
  onAction,
  onRefresh
}: Props) {
  const [detail, setDetail] = useState<VerificationDetail | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !verificationId) {
      setDetail(null);
      return;
    }
    startTransition(async () => {
      const result = await loadVerificationDetailAction(verificationId);
      setDetail(result.detail);
      if (result.detail) {
        await logVerificationViewedAction(verificationId);
      }
    });
  }, [open, verificationId]);

  if (!open) return null;

  const profile = detail?.profile;
  const name = profile?.displayName ?? profile?.username ?? detail?.userId ?? "—";

  function copyUserId() {
    if (detail?.userId) {
      void navigator.clipboard.writeText(detail.userId);
    }
  }

  function reloadDetail() {
    if (!verificationId) return;
    startTransition(async () => {
      const result = await loadVerificationDetailAction(verificationId);
      setDetail(result.detail);
      onRefresh();
    });
  }

  return (
    <CreatorDetailDrawer onClose={onClose} open={open}>
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 p-4">
          {isPending && !detail ? (
            <p className="text-sm text-zinc-400">Đang tải...</p>
          ) : detail ? (
            <>
              <div className="flex items-start gap-3">
                <AvatarFallback name={name} size="md" src={profile?.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-white">{name}</h2>
                  <p className="text-sm text-zinc-400">@{profile?.username ?? "—"}</p>
                  {profile?.email ? (
                    <p className="text-xs text-zinc-500">{profile.email}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <code className="rounded bg-white/5 px-2 py-0.5 text-zinc-400">
                      {detail.userId.slice(0, 8)}…
                    </code>
                    <button className="text-cyan-300 hover:text-cyan-200" onClick={copyUserId} type="button">
                      Copy ID
                    </button>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-zinc-300">
                      {VERIFICATION_STATUS_LABELS[detail.status]}
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-zinc-300">
                      {VERIFICATION_TYPE_LABELS[detail.verificationType]}
                    </span>
                    <span className="text-zinc-500">
                      Badge công khai: {detail.publicBadgeEnabled ? "Bật" : "Tắt"}
                    </span>
                  </div>
                </div>
                <button className="text-sm text-zinc-400 hover:text-white" onClick={onClose} type="button">
                  Đóng
                </button>
              </div>
              {capabilities.canManage ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {detail.status === "pending" ? (
                    <>
                      <Button onClick={() => onAction("approve")} type="button">
                        Duyệt
                      </Button>
                      <Button onClick={() => onAction("reject")} type="button" variant="ghost">
                        Từ chối
                      </Button>
                      <Button
                        onClick={() => onAction("needs_more_info")}
                        type="button"
                        variant="ghost"
                      >
                        Yêu cầu bổ sung
                      </Button>
                    </>
                  ) : null}
                  {detail.status === "approved" ? (
                    <Button onClick={() => onAction("revoke")} type="button" variant="ghost">
                      Thu hồi
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-red-300">Không tải được chi tiết.</p>
          )}
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 py-2">
          {TABS.map((t) => {
            if (t === "notes" && !capabilities.canViewInternalNotes) return null;
            if (t === "audit" && capabilities.isSupportLimited) return null;
            return (
              <button
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  tab === t
                    ? "bg-cyan-300/15 text-cyan-100"
                    : "text-zinc-400 hover:bg-white/5"
                }`}
                key={t}
                onClick={() => setTab(t)}
                type="button"
              >
                {TAB_LABELS[t]}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {detail ? (
            <>
              {tab === "overview" ? <OverviewTab detail={detail} /> : null}
              {tab === "profile" ? <ProfileTab detail={detail} /> : null}
              {tab === "request" ? <RequestTab detail={detail} /> : null}
              {tab === "documents" ? (
                <VerificationDocumentsTab verificationId={detail.id} />
              ) : null}
              {tab === "history" ? (
                <VerificationHistoryTab history={detail.history} />
              ) : null}
              {tab === "activity" ? <ActivityTab detail={detail} /> : null}
              {tab === "notes" && capabilities.canViewInternalNotes ? (
                <VerificationNotesTab
                  notes={detail.notes}
                  onAdded={reloadDetail}
                  verificationId={detail.id}
                />
              ) : null}
              {tab === "audit" && !capabilities.isSupportLimited ? (
                <VerificationAuditLogTab logs={detail.auditLogs} />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </CreatorDetailDrawer>
  );
}

function OverviewTab({ detail }: { detail: VerificationDetail }) {
  return (
    <div className="space-y-4 text-sm">
      <InfoGrid
        rows={[
          ["Loại xác thực", VERIFICATION_TYPE_LABELS[detail.verificationType]],
          ["Trạng thái", VERIFICATION_STATUS_LABELS[detail.status]],
          ["Ngày gửi", formatDate(detail.submittedAt ?? detail.createdAt)],
          ["Người xử lý", detail.reviewedByName ?? "—"],
          ["Ngày xử lý", formatDate(detail.reviewedAt)],
          ["Nhãn công khai", detail.publicLabel ?? "—"],
          ["Badge công khai", detail.publicBadgeEnabled ? "Bật" : "Tắt"],
          ["Nguồn", VERIFICATION_SOURCE_LABELS[detail.source]],
          ["Lý do yêu cầu", detail.requestReason ?? "—"],
          ["Ghi chú nội bộ", detail.adminNote ?? "—"]
        ]}
      />
      {detail.usernameRiskWarning ? (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-amber-200">
          {detail.usernameRiskWarning}
        </p>
      ) : null}
      {detail.riskFlags.length > 0 ? (
        <div>
          <p className="mb-2 font-semibold text-white">Cảnh báo rủi ro</p>
          <ul className="space-y-1">
            {detail.riskFlags.map((flag) => (
              <li className="text-amber-200" key={flag}>
                • {VERIFICATION_RISK_LABELS[flag]}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ProfileTab({ detail }: { detail: VerificationDetail }) {
  const p = detail.profile;
  return (
    <div className="space-y-4 text-sm">
      <InfoGrid
        rows={[
          ["Tên hiển thị", p.displayName ?? "—"],
          ["Username", p.username ? `@${p.username}` : "—"],
          ["Email", p.email ?? "—"],
          ["Ngày tạo", formatDate(p.createdAt)],
          ["Vai trò", p.role ?? "—"],
          ["Studio", p.studioName ?? "—"],
          ["Số truyện", String(p.storyCount)],
          ["Follower", String(p.followerCount)],
          ["Lượt đọc", String(p.readCount)],
          ["Kiếm tiền", p.monetizationStatus ?? "—"],
          ["Vi phạm", p.violationStatus ?? "—"]
        ]}
      />
      <div className="flex flex-wrap gap-2">
        {p.username ? (
          <Link
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-cyan-300 hover:border-cyan-400/30"
            href={getProfileUrlOrFallback(p.username)}
            target="_blank"
          >
            Hồ sơ công khai
          </Link>
        ) : null}
        <Link
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-cyan-300 hover:border-cyan-400/30"
          href={`/admin/users?id=${p.userId}`}
        >
          Admin user detail
        </Link>
        {p.isAuthor ? (
          <Link
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-cyan-300 hover:border-cyan-400/30"
            href={`/admin/creators?selectedUserId=${p.userId}`}
          >
            Admin tác giả
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function RequestTab({ detail }: { detail: VerificationDetail }) {
  return (
    <div className="space-y-3 text-sm">
      <InfoGrid
        rows={[
          ["Loại được yêu cầu", VERIFICATION_TYPE_LABELS[detail.verificationType]],
          ["Lý do người dùng", detail.requestReason ?? "—"],
          ["Ghi chú bổ sung", detail.publicNote ?? "—"],
          ["Trạng thái kiểm tra", VERIFICATION_STATUS_LABELS[detail.status]]
        ]}
      />
      <p className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-zinc-500">
        Chưa hỗ trợ tệp xác minh trong MVP.
      </p>
    </div>
  );
}

function ActivityTab({ detail }: { detail: VerificationDetail }) {
  const p = detail.profile;
  return (
    <InfoGrid
      rows={[
        ["Ngày tạo tài khoản", formatDate(p.createdAt)],
        ["Hoạt động gần nhất", formatDate(p.lastActiveAt)],
        ["Truyện / chương", `${p.storyCount} truyện`],
        ["Bài cộng đồng", String(p.communityPostCount)],
        ["Bình luận", String(p.commentCount)],
        ["Report nhận", String(p.reportCount)],
        ["Strike", String(p.strikeCount)],
        ["Doanh thu", p.revenueVnd > 0 ? `${p.revenueVnd.toLocaleString("vi-VN")} ₫` : "—"],
        ["Yêu cầu rút tiền", p.pendingPayout ? "Có" : "Không"]
      ]}
    />
  );
}

function InfoGrid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-2">
      {rows.map(([label, value]) => (
        <div className="grid grid-cols-[140px_1fr] gap-2" key={label}>
          <dt className="text-zinc-500">{label}</dt>
          <dd className="text-zinc-200">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN");
}
