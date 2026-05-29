import { AdminMessagingDashboard } from "@/components/admin/AdminMessagingDashboard";
import { ErrorState } from "@/components/ui";
import { canViewMessagingMessageContent } from "@/lib/admin/can-view-messaging-content";
import { getMessageSafetyLogs } from "@/lib/admin/get-message-safety-logs";
import { getMessageSafetyDecisions } from "@/lib/admin/get-message-safety-decisions";
import { getMessageReportsQueue } from "@/lib/admin/get-message-reports-queue";
import { getMessageUserRiskDetail } from "@/lib/admin/get-message-user-risk-detail";
import { getMessagingAuditLogs } from "@/lib/admin/get-messaging-audit-logs";
import { getActiveMessagingRestrictionsList } from "@/lib/admin/get-messaging-restrictions";
import { getMessagingRiskOverview } from "@/lib/admin/get-messaging-risk-overview";
import { getRiskyMessageUsers } from "@/lib/admin/get-risky-message-users";
import { getKeywordRulesForAdmin } from "@/lib/admin/messaging-safety-actions";
import { parseMessagingDashboardFilters } from "@/lib/admin/parse-messaging-dashboard-filters";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { getMessageSafetySettings } from "@/lib/messaging/get-message-safety-settings";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminMessagingPage({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    ["report.review", "moderation.action.create"],
    { returnTo: "/admin/messaging" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" />;
  }

  const query = await searchParams;
  const filters = parseMessagingDashboardFilters(query);
  const selectedUserId =
    typeof query.user === "string" ? query.user : undefined;

  const canViewContent = canViewMessagingMessageContent(guard.context);

  let loadError = false;

  const [
    overview,
    riskyUsers,
    reports,
    safetyLogs,
    decisions,
    restrictions,
    settings,
    keywordRules,
    auditLogs,
    selectedUserDetail
  ] = await Promise.all([
    getMessagingRiskOverview().catch(() => {
      loadError = true;
      return {
        openReports: 0,
        blockedMessages24h: 0,
        requestsToday: 0,
        restrictedUsers: 0,
        linkSpamBlocked24h: 0,
        newAccountAlerts24h: 0,
        heavilyReportedUsers: 0,
        authorSpamReports24h: 0
      };
    }),
    getRiskyMessageUsers({
      range: filters.range === "all" ? "30d" : filters.range,
      role: filters.role,
      accountAge: filters.accountAge
    }).catch(() => []),
    getMessageReportsQueue(filters).catch(() => []),
    getMessageSafetyLogs({
      range: filters.range === "all" ? "30d" : filters.range,
      status: filters.safetyStatus,
      reason: filters.safetyReason
    }).catch(() => []),
    getMessageSafetyDecisions({
      range: filters.range,
      decision: "blocked"
    }).catch(() => []),
    getActiveMessagingRestrictionsList().catch(() => []),
    getMessageSafetySettings().catch(() => null),
    getKeywordRulesForAdmin().catch(() => []),
    getMessagingAuditLogs({
      range: filters.range === "all" ? "30d" : filters.range
    }).catch(() => []),
    selectedUserId ? getMessageUserRiskDetail(selectedUserId).catch(() => null) : null
  ]);

  if (!settings) {
    loadError = true;
  }

  return (
    <AdminMessagingDashboard
      auditLogs={auditLogs}
      canViewContent={canViewContent}
      decisions={decisions}
      filters={filters}
      keywordRules={keywordRules}
      loadError={loadError}
      moderatorId={guard.context.userId}
      overview={overview}
      riskyUsers={riskyUsers}
      reports={reports}
      restrictions={restrictions}
      safetyLogs={safetyLogs}
      selectedUserDetail={selectedUserDetail}
      settings={
        settings ?? {
          id: "default",
          enabled: true,
          defaultDmPolicy: "open",
          newAccountDays: 7,
          unverifiedDailyMessageLimit: 5,
          verifiedDailyMessageLimit: 50,
          trustedDailyMessageLimit: 200,
          maxMessagesPerMinute: 20,
          maxMessagesPerDay: 200,
          maxNewRecipientsPerDay: 10,
          duplicateMessageLimitPerDay: 3,
          duplicateCooldownSeconds: 600,
          blockExternalLinksForNewUsers: true,
          blockExternalLinksForUnverified: true,
          allowInternalLinks: true,
          authorProtectionEnabled: true,
          authorDmNewUserLimit: 2,
          autoRestrictReportThreshold: 5,
          updatedAt: new Date().toISOString()
        }
      }
    />
  );
}
