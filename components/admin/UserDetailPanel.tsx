"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BanUserDialog } from "@/components/admin/BanUserDialog";
import { UserWalletLedgerSection } from "@/components/admin/UserWalletLedgerSection";
import { Button, Card } from "@/components/ui";
import { assignUserRole } from "@/lib/admin/assign-role";
import { banUserAction, unbanUserAction } from "@/lib/admin/ban-user";
import { debitCoinFromUserAction } from "@/lib/admin/debit-coin-from-user";
import { grantCoinToUserAction } from "@/lib/admin/grant-coin-to-user";
import { formatAdminRoleLabel, formatProfileStatusLabel } from "@/lib/admin/role-labels";
import { filterAssignableRoles, isElevatedRole } from "@/lib/admin/rbac-policy";
import { removeUserRole } from "@/lib/admin/remove-role";
import { createMessagingRestrictionAction } from "@/lib/admin/messaging-safety-actions";
import type { AdminUserDetailFull, AdminUserDetailTab, UserAdminCapabilities } from "@/types/admin-user";
import type { RoleCode } from "@/types/permissions";

const TABS: { id: AdminUserDetailTab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "roles", label: "Vai trò & quyền" },
  { id: "wallet", label: "Ví/Coin" },
  { id: "activity", label: "Hoạt động" },
  { id: "content", label: "Nội dung" },
  { id: "community", label: "Cộng đồng" },
  { id: "messaging", label: "Tin nhắn an toàn" },
  { id: "violations", label: "Vi phạm" },
  { id: "studio", label: "Studio tác giả" },
  { id: "verification", label: "Xác minh" },
  { id: "audit", label: "Audit log" }
];

const ALL_ROLES: RoleCode[] = [
  "reader",
  "creator",
  "verified_creator",
  "moderator",
  "content_admin",
  "finance_admin",
  "support_admin",
  "admin",
  "super_admin",
  "owner"
];

type Props = {
  detail: AdminUserDetailFull;
  capabilities: UserAdminCapabilities;
  moderatorId: string;
  onRefresh: () => void;
  onClose: () => void;
};

export function UserDetailPanel({
  detail,
  capabilities,
  moderatorId,
  onRefresh,
  onClose
}: Props) {
  const [tab, setTab] = useState<AdminUserDetailTab>("overview");
  const [assignRole, setAssignRole] = useState<RoleCode>("reader");
  const [banOpen, setBanOpen] = useState(false);
  const [coinAmount, setCoinAmount] = useState("");
  const [coinReason, setCoinReason] = useState("");
  const [pending, startTransition] = useTransition();
  const assignableRoles = filterAssignableRoles(capabilities.actorRoles, ALL_ROLES);

  const label = detail.displayName ?? detail.username ?? detail.id;

  function run(action: () => Promise<{ ok: boolean; error?: string | null }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) onRefresh();
    });
  }

  return (
    <aside className="flex h-full flex-col border-l border-white/10 bg-[#0b1016] lg:max-w-xl lg:w-full">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">{label}</h2>
            {detail.username ? (
              <p className="text-sm text-zinc-400">@{detail.username}</p>
            ) : null}
            {detail.email ? (
              <p className="text-xs text-zinc-500">{detail.email}</p>
            ) : null}
            <p className="mt-1 font-mono text-[10px] text-zinc-600">{detail.id}</p>
            <p className="text-xs text-zinc-500">
              {formatProfileStatusLabel(detail.status)} · Tạo{" "}
              {new Date(detail.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
          <button
            className="text-sm text-zinc-400 hover:text-white"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {capabilities.canBanUsers ? (
            <>
              <Button onClick={() => setBanOpen(true)} type="button" variant="danger">
                Khóa tài khoản
              </Button>
              <Button
                onClick={() => run(() => unbanUserAction(detail.id))}
                type="button"
                variant="secondary"
              >
                Mở khóa
              </Button>
            </>
          ) : null}
          {capabilities.canRestrictMessaging ? (
            <Button
              onClick={() =>
                run(() =>
                  createMessagingRestrictionAction({
                    moderatorId,
                    userId: detail.id,
                    restrictionType: "mute_24h",
                    reasonCode: "spam",
                    notifyUser: true
                  })
                )
              }
              type="button"
              variant="secondary"
            >
              Hạn chế nhắn tin 24h
            </Button>
          ) : null}
          {detail.username ? (
            <Link
              className="inline-flex items-center rounded-full border border-white/10 px-3 py-1.5 text-xs text-cyan-300"
              href={`/profile/${detail.username}`}
              target="_blank"
            >
              Hồ sơ công khai
            </Link>
          ) : null}
          {detail.creatorStudio ? (
            <Link
              className="inline-flex items-center rounded-full border border-white/10 px-3 py-1.5 text-xs text-cyan-300"
              href={`/admin/creators?user=${detail.id}`}
            >
              Studio admin
            </Link>
          ) : null}
        </div>

        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                tab === t.id
                  ? "bg-cyan-400/15 text-cyan-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              key={t.id}
              onClick={() => setTab(t.id)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "overview" ? (
          <OverviewTab detail={detail} capabilities={capabilities} />
        ) : null}
        {tab === "roles" ? (
          <RolesTab
            assignRole={assignRole}
            assignableRoles={assignableRoles}
            capabilities={capabilities}
            detail={detail}
            onAssign={() =>
              run(() => assignUserRole({ userId: detail.id, roleCode: assignRole }))
            }
            onAssignRoleChange={setAssignRole}
            onRemove={(roleCode) =>
              run(() => removeUserRole({ userId: detail.id, roleCode }))
            }
            pending={pending}
          />
        ) : null}
        {tab === "wallet" ? (
          <WalletTab
            capabilities={capabilities}
            coinAmount={coinAmount}
            coinReason={coinReason}
            detail={detail}
            onAmountChange={setCoinAmount}
            onDebit={() =>
              run(() =>
                debitCoinFromUserAction({
                  userId: detail.id,
                  amount: Number(coinAmount),
                  coinType: "bonus",
                  reason: coinReason
                })
              )
            }
            onGrant={() =>
              run(() =>
                grantCoinToUserAction({
                  userId: detail.id,
                  amount: Number(coinAmount),
                  coinType: "paid",
                  reason: coinReason
                })
              )
            }
            onReasonChange={setCoinReason}
            pending={pending}
          />
        ) : null}
        {tab === "activity" ? <ActivityTab detail={detail} /> : null}
        {tab === "content" ? <ContentTab detail={detail} /> : null}
        {tab === "community" ? <CommunityTab detail={detail} /> : null}
        {tab === "messaging" ? <MessagingTab detail={detail} /> : null}
        {tab === "violations" ? <ViolationsTab detail={detail} /> : null}
        {tab === "studio" ? <StudioTab detail={detail} /> : null}
        {tab === "verification" ? <VerificationTab detail={detail} /> : null}
        {tab === "audit" ? <AuditTab detail={detail} /> : null}
      </div>

      <BanUserDialog
        disabled={pending}
        onClose={() => setBanOpen(false)}
        onConfirm={(input) =>
          run(() =>
            banUserAction({
              userId: detail.id,
              reason: input.reason,
              endsAt: input.endsAt
            })
          )
        }
        open={banOpen}
        userLabel={label}
      />
    </aside>
  );
}

function OverviewTab({
  detail,
  capabilities
}: {
  detail: AdminUserDetailFull;
  capabilities: UserAdminCapabilities;
}) {
  return (
    <div className="space-y-3 text-sm">
      <Card className="grid gap-2 p-3 sm:grid-cols-2">
        <Stat label="Truyện đã lưu" value={detail.stats.saves} />
        <Stat label="Đang theo dõi" value={detail.stats.following} />
        <Stat label="Bài cộng đồng" value={detail.stats.communityPosts} />
        <Stat label="Bình luận" value={detail.stats.comments} />
        <Stat label="Report gửi" value={detail.stats.reportsSent} />
        <Stat label="Report nhận" value={detail.stats.reportsReceived} />
        {capabilities.canViewWallet ? (
          <Stat
            label="Coin hiện có"
            value={detail.coinBalance?.balance ?? 0}
          />
        ) : (
          <p className="text-xs text-zinc-500">Không có quyền xem ví chi tiết.</p>
        )}
      </Card>
      {detail.restrictions.length ? (
        <Card className="space-y-1 p-3">
          <p className="font-medium text-amber-200">Hạn chế đang áp dụng</p>
          {detail.restrictions.map((r) => (
            <p className="text-xs text-zinc-400" key={r.id}>
              {r.type} ({r.source})
              {r.endsAt
                ? ` · đến ${new Date(r.endsAt).toLocaleString("vi-VN")}`
                : ""}
            </p>
          ))}
        </Card>
      ) : null}
    </div>
  );
}

function RolesTab({
  detail,
  capabilities,
  assignableRoles,
  assignRole,
  onAssignRoleChange,
  onAssign,
  onRemove,
  pending
}: {
  detail: AdminUserDetailFull;
  capabilities: UserAdminCapabilities;
  assignableRoles: RoleCode[];
  assignRole: RoleCode;
  onAssignRoleChange: (r: RoleCode) => void;
  onAssign: () => void;
  onRemove: (role: RoleCode) => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-3 text-sm">
      <ul className="space-y-2">
        {detail.roles.length ? (
          detail.roles.map((role) => (
            <li
              className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2"
              key={role.code}
            >
              <span>
                {formatAdminRoleLabel(role.code as RoleCode, role.name)}
                {isElevatedRole(role.code as RoleCode) ? " ⚠" : ""}
              </span>
              {capabilities.canAssignRoles ? (
                <Button
                  disabled={pending}
                  onClick={() => onRemove(role.code as RoleCode)}
                  type="button"
                  variant="ghost"
                >
                  Gỡ
                </Button>
              ) : null}
            </li>
          ))
        ) : (
          <li className="text-zinc-500">Độc giả (mặc định)</li>
        )}
      </ul>
      {capabilities.canAssignRoles ? (
        <div className="space-y-2">
          <select
            className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-2 py-2 text-sm"
            onChange={(e) => onAssignRoleChange(e.target.value as RoleCode)}
            value={assignRole}
          >
            {assignableRoles.map((code) => (
              <option key={code} value={code}>
                {formatAdminRoleLabel(code)}
              </option>
            ))}
          </select>
          <Button disabled={pending} onClick={onAssign} type="button">
            Thêm vai trò
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function WalletTab({
  detail,
  capabilities,
  coinAmount,
  coinReason,
  onAmountChange,
  onReasonChange,
  onGrant,
  onDebit,
  pending
}: {
  detail: AdminUserDetailFull;
  capabilities: UserAdminCapabilities;
  coinAmount: string;
  coinReason: string;
  onAmountChange: (v: string) => void;
  onReasonChange: (v: string) => void;
  onGrant: () => void;
  onDebit: () => void;
  pending: boolean;
}) {
  if (!capabilities.canViewWallet) {
    return (
      <p className="text-sm text-zinc-500">Tài khoản không có quyền xem ví/coin.</p>
    );
  }

  const b = detail.coinBalance;
  return (
    <div className="space-y-3 text-sm">
      <Card className="grid gap-2 p-3 sm:grid-cols-2">
        <Stat label="Paid coin" value={b?.walletPaid ?? 0} />
        <Stat label="Bonus coin" value={b?.walletBonus ?? 0} />
        <Stat label="Tổng coin" value={b?.balance ?? 0} />
        <Stat label="Tổng nạp" value={b?.totalCredit ?? 0} />
        <Stat label="Tổng chi" value={b?.totalDebit ?? 0} />
      </Card>
      {capabilities.canAdjustCoin ? (
        <Card className="space-y-2 p-3">
          <p className="text-xs text-zinc-500">
            Điều chỉnh qua ledger — không sửa số dư trực tiếp.
          </p>
          <input
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="Số coin"
            type="number"
            value={coinAmount}
          />
          <input
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Lý do (bắt buộc)"
            value={coinReason}
          />
          <div className="flex gap-2">
            <Button disabled={pending} onClick={onGrant} type="button">
              Cộng coin
            </Button>
            <Button
              disabled={pending}
              onClick={onDebit}
              type="button"
              variant="danger"
            >
              Trừ coin
            </Button>
          </div>
        </Card>
      ) : null}
      <UserWalletLedgerSection userId={detail.id} />
    </div>
  );
}

function ActivityTab({ detail }: { detail: AdminUserDetailFull }) {
  return (
    <p className="text-sm text-zinc-400">
      Hoạt động gần đây: {detail.stats.communityPosts} bài cộng đồng,{" "}
      {detail.stats.comments} bình luận, cập nhật lần cuối{" "}
      {detail.updatedAt
        ? new Date(detail.updatedAt).toLocaleString("vi-VN")
        : "—"}
      .
    </p>
  );
}

function ContentTab({ detail }: { detail: AdminUserDetailFull }) {
  if (!detail.creatorStudio) {
    return (
      <p className="text-sm text-zinc-500">Người dùng chưa có nội dung Studio.</p>
    );
  }
  return (
    <Card className="p-3 text-sm">
      <p>Truyện đã đăng: {detail.creatorStudio.storyCount}</p>
      <Link className="text-cyan-300" href="/admin/content-review">
        Mở kiểm duyệt nội dung →
      </Link>
    </Card>
  );
}

function CommunityTab({ detail }: { detail: AdminUserDetailFull }) {
  return (
    <Card className="space-y-2 p-3 text-sm">
      <p>Bài cộng đồng: {detail.stats.communityPosts}</p>
      <p>Bình luận: {detail.stats.comments}</p>
      <Link className="text-cyan-300" href="/admin/community">
        Mở moderation cộng đồng →
      </Link>
    </Card>
  );
}

function MessagingTab({ detail }: { detail: AdminUserDetailFull }) {
  return (
    <Card className="space-y-2 p-3 text-sm">
      <p>Tin bị chặn 24h: {detail.stats.safetyBlocked24h}</p>
      <p className="text-xs text-zinc-500">
        Không hiển thị inbox riêng tư. Chỉ metadata an toàn tin nhắn.
      </p>
      <Link
        className="text-cyan-300"
        href={`/admin/messaging?user=${detail.id}`}
      >
        Mở an toàn tin nhắn (filter user) →
      </Link>
    </Card>
  );
}

function ViolationsTab({ detail }: { detail: AdminUserDetailFull }) {
  return (
    <div className="space-y-2 text-sm">
      {detail.strikes.length ? (
        detail.strikes.map((s) => (
          <Card className="p-3" key={s.id}>
            <p className="text-white">{s.policyArea}</p>
            <p className="text-xs text-zinc-500">
              {s.severity} · {s.actionTaken} ·{" "}
              {new Date(s.createdAt).toLocaleString("vi-VN")}
            </p>
            {s.note ? <p className="text-xs text-zinc-400">{s.note}</p> : null}
          </Card>
        ))
      ) : (
        <p className="text-zinc-500">Chưa có strike/vi phạm ghi nhận.</p>
      )}
    </div>
  );
}

function StudioTab({ detail }: { detail: AdminUserDetailFull }) {
  if (!detail.creatorStudio) {
    return (
      <p className="text-sm text-zinc-500">Người dùng không phải tác giả Studio.</p>
    );
  }
  return (
    <Card className="space-y-1 p-3 text-sm">
      <p className="font-medium text-white">{detail.creatorStudio.penName}</p>
      <p>Trạng thái: {detail.creatorStudio.status}</p>
      <p>Số truyện: {detail.creatorStudio.storyCount}</p>
    </Card>
  );
}

function VerificationTab({ detail }: { detail: AdminUserDetailFull }) {
  return (
    <div className="space-y-2 text-sm">
      <p>
        Tick xanh: {detail.isVerified ? "Có" : "Không"}
        {detail.verificationLabel ? ` · ${detail.verificationLabel}` : ""}
      </p>
      {detail.verifications.map((v) => (
        <Card className="p-3" key={v.id}>
          <p>{v.type}</p>
          <p className="text-xs text-zinc-500">{v.status}</p>
        </Card>
      ))}
      <Link className="text-cyan-300" href="/admin/verification">
        Mở hàng chờ xác minh →
      </Link>
    </div>
  );
}

function AuditTab({ detail }: { detail: AdminUserDetailFull }) {
  return (
    <div className="space-y-2 text-sm">
      {detail.recentAuditLogs.map((log) => (
        <Card className="p-3" key={log.id}>
          <p className="font-medium text-white">{log.action}</p>
          <p className="text-xs text-zinc-500">
            {log.actorName} · {new Date(log.createdAt).toLocaleString("vi-VN")}
          </p>
        </Card>
      ))}
      <Link className="text-cyan-300" href="/admin/audit">
        Xem audit log đầy đủ →
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <p className="text-zinc-400">
      <span className="text-zinc-500">{label}: </span>
      <span className="font-semibold text-zinc-200">
        {value.toLocaleString("vi-VN")}
      </span>
    </p>
  );
}
