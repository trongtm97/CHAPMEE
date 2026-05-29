"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AddExceptionModal,
  AddRuleModal,
  CheckUsernameModal,
  EditRuleModal,
  ImportRulesModal,
  ManualAssignModal
} from "@/components/admin/username-policy/UsernamePolicyModals";
import { UsernamePolicyExceptionsTable } from "@/components/admin/username-policy/UsernamePolicyExceptionsTable";
import { UsernamePolicyRuleDrawer } from "@/components/admin/username-policy/UsernamePolicyRuleDrawer";
import { UsernamePolicySummaryCards } from "@/components/admin/username-policy/UsernamePolicySummaryCards";
import {
  UsernamePolicyAuditTable,
  UsernamePolicyConflictsTable,
  UsernamePolicyHistoryTable,
  UsernamePolicyRulesTable
} from "@/components/admin/username-policy/UsernamePolicyTables";
import { Button } from "@/components/ui";
import { refreshUsernamePolicyAdminDataAction } from "@/lib/admin/refresh-username-policy-rules";
import { setUsernameChangeLockAction } from "@/lib/admin/username-policy-exceptions";
import { filterRulesByTab } from "@/lib/admin/username-policy-helpers";
import { updateUsernamePolicyRuleAction } from "@/lib/admin/update-username-policy-rule";
import type {
  UsernameChangeHistoryRow,
  UsernamePolicyAdminCapabilities,
  UsernamePolicyAdminTab,
  UsernamePolicyAuditLogRow,
  UsernamePolicyConflictItem,
  UsernamePolicyExceptionRow,
  UsernamePolicyOperationsSummary,
  UsernamePolicyRuleRow
} from "@/types/username-policy";

const TABS: { id: UsernamePolicyAdminTab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "rules", label: "Rule đang áp dụng" },
  { id: "banned", label: "Username bị cấm" },
  { id: "reserved", label: "Username giữ chỗ" },
  { id: "protected", label: "Từ được bảo vệ" },
  { id: "exceptions", label: "Ngoại lệ" },
  { id: "conflicts", label: "Xung đột" },
  { id: "history", label: "Lịch sử đổi username" },
  { id: "audit", label: "Audit log" }
];

type AdminUsernamePolicyPageProps = {
  rules: UsernamePolicyRuleRow[];
  history: UsernameChangeHistoryRow[];
  conflicts: UsernamePolicyConflictItem[];
  summary: UsernamePolicyOperationsSummary;
  auditLogs: UsernamePolicyAuditLogRow[];
  exceptions: UsernamePolicyExceptionRow[];
  capabilities: UsernamePolicyAdminCapabilities;
  rulesError?: string | null;
};

export function AdminUsernamePolicyPage({
  auditLogs: initialAuditLogs,
  capabilities,
  conflicts: initialConflicts,
  exceptions: initialExceptions,
  history: initialHistory,
  rules: initialRules,
  rulesError,
  summary: initialSummary
}: AdminUsernamePolicyPageProps) {
  const [rules, setRules] = useState(initialRules);
  const [history, setHistory] = useState(initialHistory);
  const [conflicts, setConflicts] = useState(initialConflicts);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [summary, setSummary] = useState(initialSummary);
  const [activeTab, setActiveTab] = useState<UsernamePolicyAdminTab>("overview");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [modal, setModal] = useState<
    "add" | "import" | "check" | "assign" | "exception" | "edit" | null
  >(null);
  const [drawerRule, setDrawerRule] = useState<UsernamePolicyRuleRow | null>(null);
  const [editRule, setEditRule] = useState<UsernamePolicyRuleRow | null>(null);
  const [exceptionRule, setExceptionRule] = useState<UsernamePolicyRuleRow | null>(null);
  const [exceptionUserId, setExceptionUserId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState<string | null>(null);
  const [lockUserId, setLockUserId] = useState<string | null>(null);
  const [lockReason, setLockReason] = useState("");

  const filteredRules = useMemo(() => {
    const tabRules =
      activeTab === "overview" ||
      activeTab === "history" ||
      activeTab === "conflicts" ||
      activeTab === "audit" ||
      activeTab === "exceptions"
        ? rules
        : filterRulesByTab(rules, activeTab);

    const q = search.trim().toLowerCase();
    if (!q) return tabRules;

    return tabRules.filter(
      (rule) =>
        rule.value.toLowerCase().includes(q) ||
        rule.normalized_value.toLowerCase().includes(q) ||
        (rule.note ?? "").toLowerCase().includes(q)
    );
  }, [activeTab, rules, search]);

  function refreshAll() {
    startTransition(async () => {
      const data = await refreshUsernamePolicyAdminDataAction();
      if (data.rules) setRules(data.rules);
      setHistory(data.history);
      setConflicts(data.conflicts);
      setAuditLogs(data.auditLogs);
      setExceptions(data.exceptions);
      setSummary(data.summary);
    });
  }

  function reloadRules() {
    refreshAll();
  }

  function toggleRule(rule: UsernamePolicyRuleRow) {
    startTransition(async () => {
      const result = await updateUsernamePolicyRuleAction({
        ruleId: rule.id,
        isActive: !rule.is_active
      });
      setMessage(result.error ?? "Đã cập nhật rule.");
      if (result.ok) refreshAll();
    });
  }

  function openExceptionForRule(ruleId: string, userId: string) {
    setExceptionRule(rules.find((r) => r.id === ruleId) ?? null);
    setExceptionUserId(userId);
    setModal("exception");
  }

  function submitLock() {
    if (!lockUserId || !lockReason.trim()) {
      setMessage("Nhập lý do khóa đổi username.");
      return;
    }
    startTransition(async () => {
      const res = await setUsernameChangeLockAction({
        userId: lockUserId,
        locked: true,
        reason: lockReason
      });
      setMessage(res.error ?? "Đã khóa đổi username cho user.");
      if (res.ok) {
        setLockUserId(null);
        setLockReason("");
        refreshAll();
      }
    });
  }

  if (rulesError) {
    return (
      <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-8 text-center">
        <p className="font-semibold text-white">Không tải được chính sách username</p>
        <p className="mt-2 text-sm text-zinc-400">
          Vui lòng thử lại hoặc kiểm tra kết nối dữ liệu.
        </p>
        <Button className="mt-4" onClick={() => window.location.reload()} type="button">
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {capabilities.canManageRules ? (
          <Button onClick={() => setModal("add")} type="button">
            + Thêm rule
          </Button>
        ) : null}
        {capabilities.canImport ? (
          <Button onClick={() => setModal("import")} type="button" variant="ghost">
            Import danh sách
          </Button>
        ) : null}
        <Button onClick={() => setModal("check")} type="button" variant="ghost">
          Kiểm tra username
        </Button>
        {capabilities.canAssignUsername ? (
          <Button onClick={() => setModal("assign")} type="button" variant="ghost">
            Gán username thủ công
          </Button>
        ) : null}
        {capabilities.canManageExceptions ? (
          <Button onClick={() => setModal("exception")} type="button" variant="ghost">
            Thêm ngoại lệ
          </Button>
        ) : null}
        <Button disabled={isPending} onClick={refreshAll} type="button" variant="ghost">
          Làm mới dữ liệu
        </Button>
      </div>

      <UsernamePolicySummaryCards
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setPage(1);
        }}
        summary={summary}
      />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((tab) => (
          <button
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              activeTab === tab.id
                ? "bg-cyan-300 text-zinc-950"
                : "border border-white/10 text-zinc-300"
            }`}
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== "history" &&
      activeTab !== "conflicts" &&
      activeTab !== "audit" &&
      activeTab !== "exceptions" ? (
        <input
          className="w-full max-w-md rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm rule..."
          value={search}
        />
      ) : null}

      {message ? <p className="text-sm text-cyan-200">{message}</p> : null}

      {lockUserId ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-white">Khóa đổi username tạm thời</p>
          <p className="text-xs text-zinc-400">User: {lockUserId}</p>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setLockReason(e.target.value)}
            placeholder="Lý do nội bộ *"
            value={lockReason}
          />
          <div className="flex gap-2">
            <Button disabled={isPending} onClick={submitLock} type="button">
              Xác nhận khóa
            </Button>
            <Button
              onClick={() => {
                setLockUserId(null);
                setLockReason("");
              }}
              type="button"
              variant="ghost"
            >
              Hủy
            </Button>
          </div>
        </div>
      ) : null}

      {activeTab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-sm font-semibold text-white">Tóm tắt nhanh</p>
            <p className="mt-2 text-sm text-zinc-400">
              {summary.conflicts > 0
                ? `Có ${summary.conflicts} xung đột cần xem xét.`
                : "Không có xung đột đang chờ xử lý."}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {summary.exceptions} ngoại lệ · {summary.changes7d} đổi username (7 ngày)
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-sm font-semibold text-white">Gợi ý thao tác</p>
            <ul className="mt-2 list-inside list-disc text-sm text-zinc-400">
              <li>Kiểm tra username trước khi gán cho user</li>
              <li>Import danh sách giữ chỗ sau khi xem trước</li>
              <li>Thêm ngoại lệ có hạn cho tài khoản chính thức</li>
            </ul>
          </div>
        </div>
      ) : null}

      {(activeTab === "rules" ||
        activeTab === "banned" ||
        activeTab === "reserved" ||
        activeTab === "protected") && (
        <UsernamePolicyRulesTable
          capabilities={capabilities}
          isPending={isPending}
          onAddException={(rule) => {
            setExceptionRule(rule);
            setExceptionUserId(null);
            setModal("exception");
          }}
          onEditRule={(rule) => {
            setEditRule(rule);
            setModal("edit");
          }}
          onPage={setPage}
          onSelectRule={setDrawerRule}
          onToggle={toggleRule}
          page={page}
          rules={filteredRules}
        />
      )}

      {activeTab === "exceptions" ? (
        <UsernamePolicyExceptionsTable
          capabilities={capabilities}
          exceptions={exceptions}
          onPage={setPage}
          onRefresh={refreshAll}
          page={page}
        />
      ) : null}

      {activeTab === "conflicts" ? (
        <UsernamePolicyConflictsTable
          capabilities={capabilities}
          conflicts={conflicts}
          onAddException={openExceptionForRule}
          onLockUsername={(userId) => setLockUserId(userId)}
          onManualAssign={(userId) => {
            setAssignUserId(userId);
            setModal("assign");
          }}
          onPage={setPage}
          page={page}
        />
      ) : null}

      {activeTab === "history" ? (
        <UsernamePolicyHistoryTable history={history} onPage={setPage} page={page} />
      ) : null}

      {activeTab === "audit" ? (
        <UsernamePolicyAuditTable
          capabilities={capabilities}
          logs={auditLogs}
          onPage={setPage}
          page={page}
        />
      ) : null}

      <AddRuleModal
        defaultRuleType={
          activeTab === "reserved"
            ? "reserved_username"
            : activeTab === "banned"
              ? "banned_username"
              : "protected_word"
        }
        onClose={() => setModal(null)}
        onSuccess={reloadRules}
        open={modal === "add"}
      />
      <CheckUsernameModal onClose={() => setModal(null)} open={modal === "check"} />
      <ImportRulesModal
        onClose={() => setModal(null)}
        onSuccess={reloadRules}
        open={modal === "import"}
      />
      <ManualAssignModal
        capabilities={capabilities}
        initialUserId={assignUserId}
        onClose={() => {
          setModal(null);
          setAssignUserId(null);
        }}
        onSuccess={reloadRules}
        open={modal === "assign"}
        rules={rules}
      />
      <AddExceptionModal
        onClose={() => {
          setModal(null);
          setExceptionRule(null);
          setExceptionUserId(null);
        }}
        onSuccess={reloadRules}
        open={modal === "exception"}
        preselectedRule={exceptionRule}
        preselectedUserId={exceptionUserId}
        rules={rules}
      />
      <EditRuleModal
        onClose={() => {
          setModal(null);
          setEditRule(null);
        }}
        onSuccess={reloadRules}
        open={modal === "edit"}
        rule={editRule}
      />

      <UsernamePolicyRuleDrawer
        auditLogs={auditLogs}
        capabilities={capabilities}
        conflicts={conflicts}
        onAddException={(rule) => {
          setExceptionRule(rule);
          setExceptionUserId(null);
          setModal("exception");
        }}
        onClose={() => setDrawerRule(null)}
        onEdit={(rule) => {
          setEditRule(rule);
          setModal("edit");
        }}
        onRefresh={reloadRules}
        open={Boolean(drawerRule)}
        rule={drawerRule}
      />
    </div>
  );
}
