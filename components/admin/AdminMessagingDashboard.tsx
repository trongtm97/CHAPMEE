"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BlockedMessagesLog } from "@/components/admin/BlockedMessagesLog";
import { MessagingAuditLogTable } from "@/components/admin/MessagingAuditLogTable";
import { MessagingReportDetailDrawer } from "@/components/admin/MessagingReportDetailDrawer";
import { MessagingReportsQueue } from "@/components/admin/MessagingReportsQueue";
import { MessagingRestrictionModal } from "@/components/admin/MessagingRestrictionModal";
import { MessagingRestrictionsTable } from "@/components/admin/MessagingRestrictionsTable";
import { MessagingSafetySettingsForm } from "@/components/admin/MessagingSafetySettingsForm";
import { MessagingSafetySummaryCards } from "@/components/admin/MessagingSafetySummaryCards";
import { MessageUserRiskPanel } from "@/components/admin/MessageUserRiskPanel";
import { RiskyMessageUsersTable } from "@/components/admin/RiskyMessageUsersTable";
import { loadMessageReportCaseAction } from "@/lib/admin/load-message-report-case";
import { buildMessagingFilterQuery } from "@/lib/admin/parse-messaging-dashboard-filters";
import { messageReportReasons } from "@/types/messages";
import type {
  MessageSafetyLogItem,
  MessageUserRiskDetail,
  MessagingDashboardFilters,
  MessagingRiskOverview,
  RiskyMessageUser
} from "@/types/admin-messaging";
import type { MessageSafetyDecisionItem } from "@/types/messaging-safety";
import type { MessageReportQueueItem } from "@/types/messaging-safety";
import type { MessagingAuditLogRow } from "@/lib/admin/get-messaging-audit-logs";
import type { MessagingRestrictionItem } from "@/types/messaging-safety";
import type { MessageSafetySettings } from "@/types/messaging-safety";

type KeywordRuleRow = {
  id: string;
  keyword: string;
  action: string;
  severity: string;
  category: string | null;
  isActive: boolean;
  createdAt: string;
};

type AdminMessagingDashboardProps = {
  overview: MessagingRiskOverview;
  riskyUsers: RiskyMessageUser[];
  reports: MessageReportQueueItem[];
  safetyLogs: MessageSafetyLogItem[];
  decisions: MessageSafetyDecisionItem[];
  restrictions: MessagingRestrictionItem[];
  settings: MessageSafetySettings;
  keywordRules: KeywordRuleRow[];
  auditLogs: MessagingAuditLogRow[];
  filters: MessagingDashboardFilters;
  moderatorId: string;
  canViewContent: boolean;
  selectedUserDetail: MessageUserRiskDetail | null;
  loadError?: boolean;
};

const TABS: { id: MessagingDashboardFilters["tab"]; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "reports", label: "Báo cáo" },
  { id: "risky", label: "Người dùng rủi ro" },
  { id: "blocked", label: "Tin bị chặn" },
  { id: "restrictions", label: "Hạn chế nhắn tin" },
  { id: "settings", label: "Cấu hình an toàn" },
  { id: "audit", label: "Log xử lý" }
];

const RANGES: { id: MessagingDashboardFilters["range"]; label: string }[] = [
  { id: "24h", label: "24 giờ" },
  { id: "7d", label: "7 ngày" },
  { id: "30d", label: "30 ngày" },
  { id: "all", label: "Tất cả" }
];

export function AdminMessagingDashboard(props: AdminMessagingDashboardProps) {
  const router = useRouter();
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [restrictTarget, setRestrictTarget] = useState<{
    userId: string;
    label: string;
  } | null>(null);

  function updateFilters(patch: Partial<MessagingDashboardFilters>) {
    const next = { ...props.filters, ...patch };
    router.push(`/admin/messaging${buildMessagingFilterQuery(next)}`);
  }

  function openUser(userId: string) {
    const params = new URLSearchParams(
      buildMessagingFilterQuery(props.filters).replace(/^\?/, "")
    );
    params.set("user", userId);
    router.push(`/admin/messaging?${params.toString()}`);
  }

  function closeUser() {
    router.push(`/admin/messaging${buildMessagingFilterQuery(props.filters)}`);
  }

  if (props.loadError) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-8 text-center">
        <p className="text-white">Không tải được dữ liệu an toàn tin nhắn.</p>
        <button
          className="mt-4 rounded-full bg-white/10 px-4 py-2 text-sm text-white"
          onClick={() => router.refresh()}
          type="button"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="page-kicker">An toàn nền tảng</p>
        <h1 className="page-title">An toàn tin nhắn</h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Theo dõi báo cáo, tin bị chặn và tài khoản có hành vi nhắn tin rủi ro. Admin chỉ
          xem nội dung liên quan đến báo cáo hoặc log an toàn.
        </p>
        <p className="text-xs text-zinc-600">
          ChapMee không mở toàn bộ hộp thư riêng tư cho admin. Chỉ hiển thị ngữ cảnh tối
          thiểu để xử lý vi phạm.
        </p>
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin/moderation">
          ← Hàng chờ moderation chung
        </Link>
      </section>

      <MessagingSafetySummaryCards
        onNavigate={(patch) => updateFilters(patch)}
        overview={props.overview}
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              props.filters.tab === tab.id
                ? "bg-cyan-400/15 text-cyan-100"
                : "bg-white/[0.04] text-zinc-500 hover:text-zinc-300"
            }`}
            key={tab.id}
            onClick={() => updateFilters({ tab: tab.id })}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <FilterBar filters={props.filters} onChange={updateFilters} />

      {props.filters.tab === "overview" ? (
        <div className="space-y-4">
          <MessagingReportsQueue
            onRestrict={(userId, label) => setRestrictTarget({ userId, label })}
            onViewCase={setActiveReportId}
            reports={props.reports.slice(0, 5)}
          />
          <BlockedMessagesLog
            decisions={props.decisions.slice(0, 5)}
            legacyLogs={props.safetyLogs.slice(0, 5)}
          />
        </div>
      ) : null}

      {props.filters.tab === "reports" ? (
        <MessagingReportsQueue
          onRestrict={(userId, label) => setRestrictTarget({ userId, label })}
          onViewCase={setActiveReportId}
          reports={props.reports}
        />
      ) : null}

      {props.filters.tab === "risky" ? (
        <RiskyMessageUsersTable onSelectUser={openUser} users={props.riskyUsers} />
      ) : null}

      {props.filters.tab === "blocked" ? (
        <BlockedMessagesLog
          decisions={props.decisions}
          legacyLogs={props.safetyLogs}
        />
      ) : null}

      {props.filters.tab === "restrictions" ? (
        <MessagingRestrictionsTable
          moderatorId={props.moderatorId}
          restrictions={props.restrictions}
        />
      ) : null}

      {props.filters.tab === "settings" ? (
        <MessagingSafetySettingsForm
          keywordRules={props.keywordRules}
          moderatorId={props.moderatorId}
          settings={props.settings}
        />
      ) : null}

      {props.filters.tab === "audit" ? (
        <MessagingAuditLogTable logs={props.auditLogs} />
      ) : null}

      {activeReportId ? (
        <MessagingReportDetailDrawer
          canViewContent={props.canViewContent}
          loadCase={(id) =>
            loadMessageReportCaseAction(id, props.canViewContent)
          }
          moderatorId={props.moderatorId}
          onClose={() => setActiveReportId(null)}
          onRefresh={() => router.refresh()}
          onRestrict={(userId, label) => {
            setActiveReportId(null);
            setRestrictTarget({ userId, label });
          }}
          reportId={activeReportId}
        />
      ) : null}

      {restrictTarget ? (
        <MessagingRestrictionModal
          moderatorId={props.moderatorId}
          onClose={() => setRestrictTarget(null)}
          onSuccess={() => router.refresh()}
          userId={restrictTarget.userId}
          userLabel={restrictTarget.label}
        />
      ) : null}

      {props.selectedUserDetail ? (
        <MessageUserRiskPanel
          detail={props.selectedUserDetail}
          moderatorId={props.moderatorId}
          onClose={closeUser}
        />
      ) : null}
    </div>
  );
}

function FilterBar({
  filters,
  onChange
}: {
  filters: MessagingDashboardFilters;
  onChange: (patch: Partial<MessagingDashboardFilters>) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <FilterField label="Khoảng thời gian">
        <select
          className="rounded-lg border border-white/10 bg-[#0b1016] px-2 py-1.5 text-sm text-zinc-200"
          onChange={(e) =>
            onChange({ range: e.target.value as MessagingDashboardFilters["range"] })
          }
          value={filters.range}
        >
          {RANGES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Trạng thái báo cáo">
        <select
          className="rounded-lg border border-white/10 bg-[#0b1016] px-2 py-1.5 text-sm text-zinc-200"
          onChange={(e) =>
            onChange({
              reportStatus: e.target.value as MessagingDashboardFilters["reportStatus"]
            })
          }
          value={filters.reportStatus}
        >
          <option value="all">Tất cả</option>
          <option value="open">Mở</option>
          <option value="reviewing">Đang xử lý</option>
          <option value="resolved">Đã xử lý</option>
          <option value="rejected">Từ chối</option>
        </select>
      </FilterField>

      <FilterField label="Mức rủi ro">
        <select
          className="rounded-lg border border-white/10 bg-[#0b1016] px-2 py-1.5 text-sm text-zinc-200"
          onChange={(e) =>
            onChange({
              riskLevel: e.target.value as MessagingDashboardFilters["riskLevel"]
            })
          }
          value={filters.riskLevel}
        >
          <option value="all">Tất cả</option>
          <option value="low">Thấp</option>
          <option value="medium">Trung bình</option>
          <option value="high">Cao</option>
          <option value="critical">Nghiêm trọng</option>
        </select>
      </FilterField>

      <FilterField label="Loại vi phạm">
        <select
          className="rounded-lg border border-white/10 bg-[#0b1016] px-2 py-1.5 text-sm text-zinc-200"
          onChange={(e) =>
            onChange({
              reportReason: e.target.value as MessagingDashboardFilters["reportReason"]
            })
          }
          value={filters.reportReason}
        >
          <option value="all">Tất cả</option>
          {messageReportReasons.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </FilterField>

      {filters.tab === "risky" ? (
        <>
          <FilterField label="Vai trò">
            <select
              className="rounded-lg border border-white/10 bg-[#0b1016] px-2 py-1.5 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({ role: e.target.value as MessagingDashboardFilters["role"] })
              }
              value={filters.role}
            >
              <option value="all">Tất cả</option>
              <option value="reader">Người đọc</option>
              <option value="creator">Tác giả</option>
            </select>
          </FilterField>
          <FilterField label="Tuổi tài khoản">
            <select
              className="rounded-lg border border-white/10 bg-[#0b1016] px-2 py-1.5 text-sm text-zinc-200"
              onChange={(e) =>
                onChange({
                  accountAge: e.target.value as MessagingDashboardFilters["accountAge"]
                })
              }
              value={filters.accountAge}
            >
              <option value="all">Tất cả</option>
              <option value="new">Tài khoản mới</option>
            </select>
          </FilterField>
        </>
      ) : null}

      <FilterField label="Tìm kiếm">
        <input
          className="min-w-[200px] rounded-lg border border-white/10 bg-[#0b1016] px-2 py-1.5 text-sm text-zinc-200"
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Tìm user, username, email, report ID, conversation ID..."
          value={filters.search}
        />
      </FilterField>
    </div>
  );
}

function FilterField({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500">
      {label}
      {children}
    </label>
  );
}
