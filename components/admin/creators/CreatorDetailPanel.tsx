"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  CreatorActionModals,
  type CreatorModalType
} from "@/components/admin/creators/CreatorActionModals";
import { Button } from "@/components/ui";
import {
  formatMonetizationStatusLabel,
  formatStudioStatusLabel,
  monetizationStatusBadgeClass
} from "@/lib/admin/creator-labels";
import { grantVerificationAction } from "@/lib/admin/grant-verification";
import { revokeVerificationAction } from "@/lib/admin/revoke-verification";
import {
  updateCreatorAdminOverridesAction,
  updateCreatorStudioStatusAction
} from "@/lib/admin/creator-monetization-actions";
import { CreatorAccessControls } from "@/components/admin/creators/CreatorAccessControls";
import type {
  AdminCreatorDetail,
  CreatorAdminCapabilities,
  CreatorDetailTab
} from "@/types/admin-creator";

const TABS: { id: CreatorDetailTab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "monetization", label: "Kiếm tiền" },
  { id: "revenue", label: "Doanh thu" },
  { id: "payout", label: "Rút tiền" },
  { id: "content", label: "Nội dung" },
  { id: "quality", label: "Chất lượng" },
  { id: "verification", label: "Xác minh" },
  { id: "overrides", label: "Ghi chú" },
  { id: "audit", label: "Audit log" }
];

function formatVnd(n: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(n);
}

type Props = {
  detail: AdminCreatorDetail;
  capabilities: CreatorAdminCapabilities;
  onClose: () => void;
  onRefresh: () => void;
  initialModal?: CreatorModalType | null;
  initialTab?: CreatorDetailTab | null;
  onClearInitial?: () => void;
};

export function CreatorDetailPanel({
  detail,
  capabilities,
  onClose,
  onRefresh,
  initialModal,
  initialTab,
  onClearInitial
}: Props) {
  const [tab, setTab] = useState<CreatorDetailTab>(initialTab ?? "overview");
  const [modal, setModal] = useState<CreatorModalType>(initialModal ?? null);
  const label = detail.displayName ?? detail.username ?? "Tác giả";

  useEffect(() => {
    if (initialTab) setTab(initialTab);
    if (initialModal) setModal(initialModal);
    if (initialTab || initialModal) onClearInitial?.();
  }, [initialTab, initialModal, onClearInitial]);

  async function copyUserId() {
    await navigator.clipboard.writeText(detail.userId);
  }

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="shrink-0 border-b border-white/10 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex gap-3">
              {detail.avatarUrl ? (
                <img alt="" className="h-12 w-12 rounded-full object-cover" src={detail.avatarUrl} />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-sm text-zinc-400">
                  {label.slice(0, 1)}
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-white">{label}</h2>
                {detail.username ? (
                  <p className="text-sm text-zinc-500">@{detail.username}</p>
                ) : null}
                {detail.email ? <p className="text-xs text-zinc-600">{detail.email}</p> : null}
                <p className="text-sm text-zinc-400">{detail.studioName ?? "Chưa có Studio"}</p>
                <button
                  className="mt-1 text-xs text-cyan-300 hover:text-cyan-200"
                  onClick={() => void copyUserId()}
                  type="button"
                >
                  Sao chép User ID
                </button>
              </div>
            </div>
            <button
              className="text-zinc-500 hover:text-white"
              onClick={onClose}
              type="button"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge>Tác giả</Badge>
            {detail.isVerified ? <Badge variant="cyan">Đã xác minh</Badge> : null}
            {detail.hasBlueTick ? <Badge variant="cyan">Tick xanh</Badge> : null}
            {detail.monetizationEnabled ? (
              <Badge variant="green">Kiếm tiền bật</Badge>
            ) : null}
            <Badge variant={detail.payoutEnabled ? "green" : "muted"}>
              Rút tiền: {detail.payoutEnabled ? "Bật" : "Tắt"}
            </Badge>
            <Badge variant="muted">
              Kiếm tiền: {formatMonetizationStatusLabel(detail.monetizationStatus)}
            </Badge>
            {detail.hasActiveWarning ? <Badge variant="warn">Cảnh báo</Badge> : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {detail.username ? (
              <QuickLink href={`/@${detail.username}`}>Mở hồ sơ</QuickLink>
            ) : null}
            <QuickLink href="/studio">Mở Studio</QuickLink>
            {capabilities.canManageMonetization ? (
              <QuickBtn onClick={() => setModal("approve_monetization")}>
                Duyệt kiếm tiền
              </QuickBtn>
            ) : null}
            {capabilities.canManageRevenueShare ? (
              <QuickBtn onClick={() => setModal("revenue_share")}>Cấu hình phí</QuickBtn>
            ) : null}
            <QuickLink href="/admin/withdrawals">Xem ví</QuickLink>
            {capabilities.canManageMonetization ? (
              <QuickBtn onClick={() => setModal("suspend_monetization")} warn>
                Tạm dừng
              </QuickBtn>
            ) : null}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 py-1">
          {TABS.map((t) => (
            <button
              className={`shrink-0 rounded-lg px-2 py-1.5 text-xs ${tab === t.id ? "bg-cyan-500/15 text-cyan-200" : "text-zinc-500 hover:text-zinc-300"}`}
              key={t.id}
              onClick={() => setTab(t.id)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm text-zinc-300">
          {tab === "overview" && (
            <OverviewTab capabilities={capabilities} detail={detail} onRefresh={onRefresh} />
          )}
          {tab === "monetization" && (
            <MonetizationTab
              capabilities={capabilities}
              detail={detail}
              onOpenModal={setModal}
              onRefresh={onRefresh}
            />
          )}
          {tab === "revenue" && (
            <RevenueTab detail={detail} limited={capabilities.isSupportLimited} />
          )}
          {tab === "payout" && (
            <PayoutTab
              capabilities={capabilities}
              detail={detail}
              onOpenModal={setModal}
            />
          )}
          {tab === "content" && <ContentTab detail={detail} />}
          {tab === "quality" && <QualityTab detail={detail} />}
          {tab === "verification" && (
            <VerificationTab
              capabilities={capabilities}
              detail={detail}
              onRefresh={onRefresh}
            />
          )}
          {tab === "overrides" && (
            <NotesTab
              capabilities={capabilities}
              detail={detail}
              onRefresh={onRefresh}
            />
          )}
          {tab === "audit" && <AuditTab detail={detail} />}
        </div>
      </div>

      <CreatorActionModals
        capabilities={capabilities}
        detail={detail}
        modal={modal}
        onClose={() => setModal(null)}
        onSuccess={onRefresh}
      />
    </>
  );
}

function Badge({
  children,
  variant = "muted"
}: {
  children: React.ReactNode;
  variant?: "muted" | "cyan" | "green" | "warn";
}) {
  const cls =
    variant === "cyan"
      ? "bg-cyan-500/15 text-cyan-300"
      : variant === "green"
        ? "bg-emerald-500/15 text-emerald-300"
        : variant === "warn"
          ? "bg-amber-500/15 text-amber-300"
          : "bg-zinc-500/15 text-zinc-400";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${cls}`}>
      {children}
    </span>
  );
}

function QuickLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      className="rounded-lg border border-white/10 px-2 py-1 text-xs text-cyan-300 hover:border-cyan-400/30"
      href={href}
      target="_blank"
    >
      {children}
    </Link>
  );
}

function QuickBtn({
  children,
  onClick,
  warn
}: {
  children: React.ReactNode;
  onClick: () => void;
  warn?: boolean;
}) {
  return (
    <button
      className={`rounded-lg border border-white/10 px-2 py-1 text-xs ${warn ? "text-orange-300 hover:border-orange-400/30" : "text-cyan-300 hover:border-cyan-400/30"}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function OverviewTab({
  detail,
  capabilities,
  onRefresh
}: {
  detail: AdminCreatorDetail;
  capabilities: CreatorAdminCapabilities;
  onRefresh: () => void;
}) {
  const s = detail.stats;
  return (
    <div className="space-y-4">
    <dl className="grid gap-2 sm:grid-cols-2">
      <Stat label="Ngày tạo tài khoản" value={new Date(detail.accountCreatedAt).toLocaleDateString("vi-VN")} />
      <Stat
        label="Ngày tạo Studio"
        value={
          detail.studioCreatedAt
            ? new Date(detail.studioCreatedAt).toLocaleDateString("vi-VN")
            : "—"
        }
      />
      <Stat label="Trạng thái Studio" value={formatStudioStatusLabel(detail.studioStatus)} />
      <Stat
        label="Nội dung"
        value={`${s.storyCount} truyện · ${s.chapterCount} chương`}
      />
      <Stat label="Lượt đọc" value={s.totalReads.toLocaleString("vi-VN")} />
      <Stat label="Follow" value={String(s.followCount)} />
      <Stat label="Bình luận" value={String(s.commentCount)} />
      <Stat label="Lưu truyện" value={String(s.saveCount)} />
      <Stat label="Doanh thu ròng" value={formatVnd(s.netRevenueVnd)} />
      <Stat label="Số dư có thể rút" value={formatVnd(s.availableBalanceVnd)} />
      <Stat
        label="Kiếm tiền"
        value={formatMonetizationStatusLabel(detail.monetizationStatus)}
      />
      <Stat label="Payout" value={detail.payoutEnabled ? "Đã bật" : "Tắt"} />
      <Stat
        label="Xác minh"
        value={detail.verificationLabel ?? (detail.isVerified ? "Đã xác minh" : "Chưa")}
      />
    </dl>
    {capabilities.canManageStudio && detail.creatorProfileId ? (
      <StudioSection capabilities={capabilities} detail={detail} onRefresh={onRefresh} />
    ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-zinc-200">{value}</dd>
    </div>
  );
}

function StudioSection({
  detail,
  capabilities,
  onRefresh
}: {
  detail: AdminCreatorDetail;
  capabilities: CreatorAdminCapabilities;
  onRefresh: () => void;
}) {
  const [studioState, studioAction, studioPending] = useActionState(
    updateCreatorStudioStatusAction,
    { ok: false, error: null as string | null }
  );
  const refreshedRef = useRef(false);
  useEffect(() => {
    if (studioState.ok && !refreshedRef.current) {
      refreshedRef.current = true;
      onRefresh();
    }
    if (!studioState.ok) refreshedRef.current = false;
  }, [studioState.ok, onRefresh]);
  return (
    <div className="space-y-3">
      <p>
        <strong className="text-zinc-400">Tên hiển thị:</strong> {detail.studioName ?? "—"}
      </p>
      <p>
        <strong className="text-zinc-400">Mô tả:</strong> {detail.studioBio ?? "—"}
      </p>
      <p>
        <strong className="text-zinc-400">Trạng thái:</strong>{" "}
        {formatStudioStatusLabel(detail.studioStatus)}
      </p>
      <p className="text-zinc-500">
        {detail.stats.storyCount} truyện · {detail.stats.chapterCount} chương
      </p>
      {capabilities.canManageStudio && detail.creatorProfileId ? (
        <form action={studioAction} className="space-y-2 rounded-xl border border-white/10 p-3">
          {studioState.error ? (
            <p className="text-sm text-red-300">{studioState.error}</p>
          ) : null}
          <input name="creator_profile_id" type="hidden" value={detail.creatorProfileId} />
          <input
            name="status"
            type="hidden"
            value={detail.studioStatus === "suspended" ? "active" : "suspended"}
          />
          <textarea
            className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-2 py-1 text-sm"
            name="reason"
            placeholder="Lý do khóa/mở Studio"
            required
            rows={2}
          />
          <Button
            loading={studioPending}
            type="submit"
            variant={detail.studioStatus === "suspended" ? "secondary" : "danger"}
          >
            {detail.studioStatus === "suspended" ? "Gỡ khóa Studio" : "Tạm khóa Studio"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function MonetizationTab({
  detail,
  capabilities,
  onOpenModal,
  onRefresh
}: {
  detail: AdminCreatorDetail;
  capabilities: CreatorAdminCapabilities;
  onOpenModal: (m: CreatorModalType) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <CreatorAccessControls
        access={detail.creatorAccess}
        canManage={capabilities.canManageMonetization}
        onRefresh={onRefresh}
        userId={detail.userId}
      />
      <span
        className={`inline-flex rounded px-2 py-0.5 text-xs ${monetizationStatusBadgeClass(detail.monetizationStatus)}`}
      >
        Hồ sơ cũ: {formatMonetizationStatusLabel(detail.monetizationStatus)}
      </span>
      <div>
        <h4 className="text-xs font-medium uppercase text-zinc-500">Gợi ý phát triển</h4>
        <ul className="mt-2 space-y-1">
          {detail.eligibility.map((e) => (
            <li key={e.key}>
              {e.met ? "✓" : "○"} {e.label} — <span className="text-zinc-500">{e.description}</span>
            </li>
          ))}
        </ul>
      </div>
      {detail.rejectedReason ? (
        <p className="text-red-300">Lý do từ chối: {detail.rejectedReason}</p>
      ) : null}
      {detail.suspendedReason ? (
        <p className="text-orange-300">Tạm dừng: {detail.suspendedReason}</p>
      ) : null}
      {capabilities.canManageMonetization ? (
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/creator-fee-policies?creator=${detail.userId}&create=1`}>
            <Button type="button" variant="secondary">
              Chính sách phí riêng
            </Button>
          </Link>
          <Button onClick={() => onOpenModal("approve_monetization")} type="button">
            Duyệt kiếm tiền
          </Button>
          <Button onClick={() => onOpenModal("reject_monetization")} type="button" variant="danger">
            Từ chối
          </Button>
          <Button onClick={() => onOpenModal("suspend_monetization")} type="button" variant="danger">
            Tạm dừng
          </Button>
          <Button onClick={() => onOpenModal("restore_monetization")} type="button" variant="secondary">
            Khôi phục
          </Button>
          <Button
            onClick={() => onOpenModal("permanent_disable")}
            type="button"
            variant="danger"
          >
            Khóa vĩnh viễn
          </Button>
        </div>
      ) : null}
      <RevenueSharePreview detail={detail} onEdit={() => onOpenModal("revenue_share")} />
    </div>
  );
}

function RevenueSharePreview({
  detail,
  onEdit
}: {
  detail: AdminCreatorDetail;
  onEdit?: () => void;
}) {
  const p = detail.useCustomRevenueShare
    ? detail.customRevenueShare!
    : detail.defaultRevenueShare;
  const rows = [
    ["Paid chapter", p.paidChapter],
    ["Tip", p.tip],
    ["Fan club", p.fanClub],
    ["VIP pool", p.vipPool],
    ["Bonus pool", p.bonusPool]
  ] as const;
  return (
    <div className="rounded-xl border border-white/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium text-zinc-500">
          {detail.useCustomRevenueShare
            ? "Đang dùng tỷ lệ riêng"
            : "Đang dùng tỷ lệ mặc định nền tảng"}
        </h4>
        {onEdit ? (
          <button className="text-xs text-cyan-300" onClick={onEdit} type="button">
            Chỉnh tỷ lệ riêng
          </button>
        ) : null}
      </div>
      <ul className="mt-2 space-y-1 text-xs">
        {rows.map(([label, pct]) => (
          <li key={label}>
            {label}: Tác giả nhận {pct}%, ChapMee giữ {100 - pct}%
          </li>
        ))}
      </ul>
      {detail.revenueShareHistory.length > 0 ? (
        <p className="mt-2 text-[11px] text-zinc-600">
          Có {detail.revenueShareHistory.length} lần thay đổi — xem tab Ghi chú / audit.
        </p>
      ) : null}
    </div>
  );
}

function RevenueTab({
  detail,
  limited
}: {
  detail: AdminCreatorDetail;
  limited: boolean;
}) {
  if (limited) {
    return <p className="text-zinc-500">Bạn không có quyền xem chi tiết doanh thu.</p>;
  }
  const s = detail.stats;
  return (
    <div className="space-y-3">
      <p>Tổng doanh thu ròng (đã cộng ví): {formatVnd(s.netRevenueVnd)}</p>
      <p>Đang chờ đối soát: {formatVnd(s.pendingRevenueVnd)}</p>
      <p>Đã rút: {formatVnd(s.totalWithdrawnVnd)}</p>
      <h4 className="text-xs font-medium text-zinc-500">Giao dịch gần đây</h4>
      <ul className="space-y-1 text-xs">
        {detail.ledgerPreview.length === 0 ? (
          <li className="text-zinc-500">Chưa có giao dịch.</li>
        ) : (
          detail.ledgerPreview.map((e) => (
            <li key={e.id}>
              {new Date(e.createdAt).toLocaleString("vi-VN")} · {e.type} ·{" "}
              {formatVnd(e.amountVnd)} ({e.direction})
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function PayoutTab({
  detail,
  capabilities,
  onOpenModal
}: {
  detail: AdminCreatorDetail;
  capabilities: CreatorAdminCapabilities;
  onOpenModal: (m: CreatorModalType) => void;
}) {
  if (!capabilities.canViewPayoutDetail) {
    return <p className="text-zinc-500">Không có quyền xem chi tiết rút tiền.</p>;
  }
  return (
    <div className="space-y-3">
      <p>Số dư có thể rút: {formatVnd(detail.stats.availableBalanceVnd)}</p>
      <p>Payout: {detail.payoutEnabled ? "Đã bật" : "Tắt"}</p>
      {capabilities.canManagePayout ? (
        <Button onClick={() => onOpenModal("toggle_payout")} type="button" variant="secondary">
          Bật/tắt payout
        </Button>
      ) : null}
      <h4 className="text-xs font-medium text-zinc-500">Yêu cầu rút tiền</h4>
      <ul className="space-y-2 text-xs">
        {detail.payoutRequests.length === 0 ? (
          <li className="text-zinc-500">Không có yêu cầu.</li>
        ) : (
          detail.payoutRequests.map((p) => (
            <li className="rounded-lg border border-white/10 p-2" key={p.id}>
              {formatVnd(p.amountVnd)} · {p.status} ·{" "}
              {new Date(p.requestedAt).toLocaleDateString("vi-VN")}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function ContentTab({ detail }: { detail: AdminCreatorDetail }) {
  return (
    <ul className="space-y-2">
      {detail.recentStories.length === 0 ? (
        <li className="text-zinc-500">Chưa có truyện.</li>
      ) : (
        detail.recentStories.map((s) => (
          <li className="rounded-lg border border-white/10 p-2" key={s.id}>
            <Link className="text-cyan-300 hover:text-cyan-200" href={`/truyen/${s.slug}`}>
              {s.title}
            </Link>
            <p className="text-xs text-zinc-500">
              {s.status} · {s.readCount.toLocaleString("vi-VN")} lượt đọc
            </p>
            <Link className="text-xs text-zinc-500" href={`/admin/content?story=${s.id}`}>
              Kiểm duyệt
            </Link>
          </li>
        ))
      )}
    </ul>
  );
}

function QualityTab({ detail }: { detail: AdminCreatorDetail }) {
  return (
    <div className="space-y-4">
      <ul className="space-y-2 text-xs">
        {detail.qualityCases.length === 0 ? (
          <li className="text-zinc-500">Không có case chất lượng.</li>
        ) : (
          detail.qualityCases.map((c) => (
            <li className="rounded-lg border border-white/10 p-2" key={c.id}>
              {c.storyTitle} · lần {c.attempt} · {c.action}
              <br />
              <Link className="text-cyan-300" href="/admin/content-quality">
                Xem case
              </Link>
            </li>
          ))
        )}
      </ul>
      {detail.strikes.length > 0 ? (
        <>
          <h4 className="text-xs font-medium text-zinc-500">Strike / vi phạm</h4>
          <ul className="space-y-2 text-xs">
            {detail.strikes.map((s) => (
              <li className="rounded-lg border border-white/10 p-2" key={s.id}>
                {s.isActive ? "Đang hiệu lực" : "Hết hạn"} · {s.reason ?? "—"}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function VerificationTab({
  detail,
  capabilities,
  onRefresh
}: {
  detail: AdminCreatorDetail;
  capabilities: CreatorAdminCapabilities;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-3">
      <p>
        Tick xanh: {detail.hasBlueTick ? "Có" : "Không"} ·{" "}
        {detail.verificationLabel ?? "—"}
      </p>
      <ul className="space-y-2 text-xs">
        {detail.verifications.map((v) => (
          <li key={v.id}>
            {v.type} · {v.status}
          </li>
        ))}
      </ul>
      {capabilities.canManageVerification ? (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              void grantVerificationAction({
                userId: detail.userId,
                verificationType: "notable_author",
                publicLabel: detail.studioName
              }).then(() => onRefresh())
            }
            type="button"
          >
            Cấp tick xanh
          </Button>
          <Button
            disabled={
              !detail.verifications.find((v) => v.status === "approved")?.id
            }
            onClick={() => {
              const approved = detail.verifications.find((v) => v.status === "approved");
              if (!approved) return;
              void revokeVerificationAction({
                requestId: approved.id,
                revokeReason: "Thu hồi bởi admin"
              }).then(() => onRefresh());
            }}
            type="button"
            variant="danger"
          >
            Thu hồi tick
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function NotesTab({
  detail,
  capabilities,
  onRefresh
}: {
  detail: AdminCreatorDetail;
  capabilities: CreatorAdminCapabilities;
  onRefresh: () => void;
}) {
  const [noteState, noteAction, notePending] = useActionState(
    updateCreatorAdminOverridesAction,
    { ok: false, error: null as string | null }
  );
  const noteRefreshed = useRef(false);
  useEffect(() => {
    if (noteState.ok && !noteRefreshed.current) {
      noteRefreshed.current = true;
      onRefresh();
    }
    if (!noteState.ok) noteRefreshed.current = false;
  }, [noteState.ok, onRefresh]);

  const o = detail.adminOverrides;

  return (
    <div className="space-y-4 text-xs">
      <p className="text-zinc-500">
        Ghi chú chỉ dành cho admin. Tác giả không thấy nội dung này.
      </p>
      {o.internalNote ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-zinc-300">
          {o.internalNote}
        </div>
      ) : (
        <p className="text-zinc-600">Chưa có ghi chú.</p>
      )}
      {capabilities.canManageMonetization && detail.monetizationProfileId ? (
        <form action={noteAction} className="space-y-2 rounded-xl border border-white/10 p-3">
          {noteState.error ? <p className="text-red-300">{noteState.error}</p> : null}
          {noteState.ok ? (
            <p className="text-emerald-300">Đã lưu ghi chú.</p>
          ) : null}
          <input name="profile_id" type="hidden" value={detail.monetizationProfileId} />
          {o.payoutMinAmount != null ? (
            <input name="payout_min_amount" type="hidden" value={String(o.payoutMinAmount)} />
          ) : null}
          <input
            name="strategic_partner"
            type="hidden"
            value={o.strategicPartner ? "true" : "false"}
          />
          <input
            name="bonus_pool_eligible"
            type="hidden"
            value={o.bonusPoolEligible ? "true" : "false"}
          />
          <textarea
            className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm text-zinc-200"
            defaultValue={o.internalNote ?? ""}
            name="internal_note"
            placeholder="Ghi chú nội bộ về tác giả..."
            rows={4}
          />
          <input
            className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm"
            name="reason"
            placeholder="Lý do cập nhật (bắt buộc)"
            required
          />
          <Button loading={notePending} type="submit">
            Lưu ghi chú
          </Button>
        </form>
      ) : null}
      {detail.revenueShareHistory.length > 0 ? (
        <>
          <h4 className="text-xs font-medium text-zinc-500">Lịch sử thay đổi tỷ lệ</h4>
          <ul className="space-y-2">
            {detail.revenueShareHistory.map((h) => (
              <li className="rounded-lg border border-white/10 p-2" key={h.id}>
                <p className="text-zinc-300">{h.reason}</p>
                <p className="text-zinc-600">
                  {new Date(h.createdAt).toLocaleString("vi-VN")}
                  {h.createdByLabel ? ` · ${h.createdByLabel}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <dl className="space-y-2 border-t border-white/10 pt-3">
        <Stat label="Payout tối thiểu" value={o.payoutMinAmount != null ? String(o.payoutMinAmount) : "Mặc định"} />
        <Stat label="Đối tác chiến lược" value={o.strategicPartner ? "Có" : "Không"} />
      </dl>
    </div>
  );
}

function AuditTab({ detail }: { detail: AdminCreatorDetail }) {
  return (
    <ul className="space-y-2 text-xs">
      {detail.auditLogs.length === 0 ? (
        <li className="text-zinc-500">Chưa có audit log.</li>
      ) : (
        detail.auditLogs.map((l) => (
          <li className="rounded-lg border border-white/10 p-2" key={l.id}>
            <p className="text-zinc-200">{l.action}</p>
            <p className="text-zinc-500">
              {new Date(l.createdAt).toLocaleString("vi-VN")} · {l.actorLabel ?? "—"}
            </p>
            {l.reason ? <p className="text-zinc-600">{l.reason}</p> : null}
          </li>
        ))
      )}
    </ul>
  );
}
