"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ModalShell } from "@/components/admin/username-policy/ModalShell";
import { RulePickerField } from "@/components/admin/username-policy/RulePickerField";
import { UserPickerField } from "@/components/admin/username-policy/UserPickerField";
import { Button } from "@/components/ui";
import { checkUsernamePolicyAction } from "@/lib/admin/check-username-policy";
import { createUsernamePolicyRuleAction } from "@/lib/admin/create-username-policy-rule";
import {
  importUsernameRulesAction,
  previewUsernameRulesImportAction
} from "@/lib/admin/import-username-rules";
import {
  ENFORCEMENT_LABELS,
  MATCH_TYPE_LABELS,
  RULE_TYPE_LABELS,
  SCOPE_LABELS
} from "@/lib/admin/username-policy-labels";
import { searchAdminUsers } from "@/lib/admin/get-users";
import {
  adminSetUserUsernameAction,
  addAllowedUserToRuleAction,
  editUsernamePolicyRuleAction
} from "@/lib/admin/update-username-policy-rule";
import { validateUsernameFormat } from "@/lib/username/normalize-username";
import type { AdminUserSearchResult } from "@/lib/admin/get-users";
import type {
  UsernamePolicyAdminCapabilities,
  UsernamePolicyEnforcementLevel,
  UsernamePolicyImportPreview,
  UsernamePolicyMatchType,
  UsernamePolicyRuleRow,
  UsernamePolicyRuleType,
  UsernamePolicyScope
} from "@/types/username-policy";

const RULE_TYPES = Object.keys(RULE_TYPE_LABELS) as UsernamePolicyRuleType[];
const MATCH_TYPES = Object.keys(MATCH_TYPE_LABELS) as UsernamePolicyMatchType[];
const SCOPES = Object.keys(SCOPE_LABELS) as UsernamePolicyScope[];
const ENFORCEMENTS = Object.keys(ENFORCEMENT_LABELS) as UsernamePolicyEnforcementLevel[];

function SelectField<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
  disabled
}: {
  label: string;
  value: T;
  options: T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-zinc-400">{label}</span>
      <select
        className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        value={value}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labels[opt]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AddRuleModal({
  open,
  onClose,
  onSuccess,
  defaultRuleType
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultRuleType?: UsernamePolicyRuleType;
}) {
  const [ruleType, setRuleType] = useState<UsernamePolicyRuleType>(
    defaultRuleType ?? "protected_word"
  );
  const [value, setValue] = useState("");
  const [matchType, setMatchType] = useState<UsernamePolicyMatchType>("contains");
  const [scope, setScope] = useState<UsernamePolicyScope>("both");
  const [enforcement, setEnforcement] = useState<UsernamePolicyEnforcementLevel>("block");
  const [priority, setPriority] = useState(0);
  const [note, setNote] = useState("");
  const [wideImpact, setWideImpact] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const formatWarn = useMemo(() => {
    if (!value.trim()) return null;
    const f = validateUsernameFormat(value);
    return f.error;
  }, [value]);

  if (!open) return null;

  function submit() {
    if (wideImpact && !confirmed) {
      setMessage("Vui lòng xác nhận rule ảnh hưởng diện rộng.");
      return;
    }
    startTransition(async () => {
      const result = await createUsernamePolicyRuleAction({
        ruleType,
        value,
        matchType,
        scope,
        enforcementLevel: enforcement,
        priority,
        note: note || null
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      onSuccess();
      onClose();
    });
  }

  return (
    <ModalShell onClose={onClose} title="+ Thêm rule">
      <div className="space-y-3">
        <SelectField
          label="Loại rule"
          labels={RULE_TYPE_LABELS}
          onChange={setRuleType}
          options={RULE_TYPES}
          value={ruleType}
        />
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Giá trị</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(e) => setValue(e.target.value)}
            value={value}
          />
          {formatWarn ? <p className="text-xs text-amber-300">{formatWarn}</p> : null}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Kiểu khớp"
            labels={MATCH_TYPE_LABELS}
            onChange={setMatchType}
            options={MATCH_TYPES}
            value={matchType}
          />
          <SelectField
            label="Phạm vi"
            labels={SCOPE_LABELS}
            onChange={setScope}
            options={SCOPES}
            value={scope}
          />
          <SelectField
            label="Mức xử lý"
            labels={ENFORCEMENT_LABELS}
            onChange={setEnforcement}
            options={ENFORCEMENTS}
            value={enforcement}
          />
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">Độ ưu tiên</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              onChange={(e) => setPriority(Number(e.target.value))}
              type="number"
              value={priority}
            />
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Ghi chú nội bộ</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(e) => setNote(e.target.value)}
            value={note}
          />
        </label>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-zinc-400">
          <p>Rule này sẽ áp dụng cho: {SCOPE_LABELS[scope]}</p>
          <p>Cách xử lý: {ENFORCEMENT_LABELS[enforcement]}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input checked={wideImpact} onChange={(e) => setWideImpact(e.target.checked)} type="checkbox" />
          Rule ảnh hưởng diện rộng (contains/regex trên phạm vi rộng)
        </label>
        {wideImpact ? (
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} type="checkbox" />
            Tôi hiểu rule này có thể chặn nhiều username/tên hiển thị
          </label>
        ) : null}
        {message ? <p className="text-sm text-amber-300">{message}</p> : null}
        <Button disabled={isPending} onClick={submit} type="button">
          Tạo rule
        </Button>
      </div>
    </ModalShell>
  );
}

export function CheckUsernameModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [user, setUser] = useState<AdminUserSearchResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof checkUsernamePolicyAction>>["result"]>(null);

  if (!open) return null;

  function runCheck() {
    startTransition(async () => {
      const res = await checkUsernamePolicyAction({
        username,
        displayName: displayName || undefined,
        userId: user?.id
      });
      if (res.error) {
        setMessage(res.error);
        return;
      }
      setResult(res.result);
      setMessage(null);
    });
  }

  return (
    <ModalShell onClose={onClose} title="Kiểm tra username" wide>
      <div className="space-y-3">
        <UserPickerField label="User đang kiểm tra (tuỳ chọn)" onSelect={setUser} selected={user} />
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Username cần kiểm tra</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(e) => setUsername(e.target.value)}
            value={username}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Tên hiển thị (tuỳ chọn)</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(e) => setDisplayName(e.target.value)}
            value={displayName}
          />
        </label>
        <Button disabled={isPending} onClick={runCheck} type="button">
          Kiểm tra
        </Button>
        {message ? <p className="text-sm text-amber-300">{message}</p> : null}
        {result ? (
          <div className="space-y-2 rounded-lg border border-white/10 p-3 text-sm">
            <p className={result.username.valid ? "text-emerald-300" : "text-red-300"}>
              Username: {result.username.valid ? "Hợp lệ" : "Không được dùng"}
              {result.username.message ? ` — ${result.username.message}` : ""}
            </p>
            {result.displayName.message ? (
              <p className="text-zinc-300">Tên hiển thị: {result.displayName.message}</p>
            ) : null}
            {result.username.isTaken ? (
              <p className="text-amber-300">Username đã tồn tại trên hệ thống.</p>
            ) : null}
            {result.hits.length > 0 ? (
              <ul className="space-y-1 text-zinc-400">
                {result.hits.map((h) => (
                  <li key={`${h.ruleId}-${h.field}`}>
                    · {RULE_TYPE_LABELS[h.ruleType]} / {MATCH_TYPE_LABELS[h.matchType]} /{" "}
                    {ENFORCEMENT_LABELS[h.enforcementLevel]}
                    {h.hasException ? " (có ngoại lệ)" : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            {result.suggestions.length > 0 ? (
              <p className="text-xs text-zinc-500">
                Gợi ý: {result.suggestions.join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

export function ImportRulesModal({
  open,
  onClose,
  onSuccess
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [lines, setLines] = useState("");
  const [ruleType, setRuleType] = useState<UsernamePolicyRuleType>("reserved_username");
  const [matchType, setMatchType] = useState<UsernamePolicyMatchType>("exact");
  const [scope, setScope] = useState<UsernamePolicyScope>("username");
  const [enforcement, setEnforcement] = useState<UsernamePolicyEnforcementLevel>("block");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<UsernamePolicyImportPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function runPreview() {
    startTransition(async () => {
      const res = await previewUsernameRulesImportAction({ lines, ruleType });
      if (res.error) setMessage(res.error);
      else {
        setPreview(res.preview);
        setMessage(null);
      }
    });
  }

  function runImport() {
    if (!preview || preview.validCount === 0) {
      setMessage("Vui lòng xem trước và có ít nhất một dòng hợp lệ.");
      return;
    }
    startTransition(async () => {
      const res = await importUsernameRulesAction({
        lines,
        ruleType,
        matchType,
        scope,
        enforcementLevel: enforcement,
        note: note || null
      });
      if (res.error) {
        setMessage(res.error);
        return;
      }
      setMessage(`Đã import ${res.imported} rule.`);
      onSuccess();
      onClose();
    });
  }

  return (
    <ModalShell onClose={onClose} title="Import danh sách" wide>
      <div className="space-y-3">
        <textarea
          className="min-h-32 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(e) => {
            setLines(e.target.value);
            setPreview(null);
          }}
          placeholder={"son-tung\nmtp\nchapmee\nofficial, ghi chú"}
          value={lines}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Loại rule"
            labels={RULE_TYPE_LABELS}
            onChange={setRuleType}
            options={RULE_TYPES}
            value={ruleType}
          />
          <SelectField
            label="Kiểu khớp"
            labels={MATCH_TYPE_LABELS}
            onChange={setMatchType}
            options={MATCH_TYPES}
            value={matchType}
          />
          <SelectField
            label="Phạm vi"
            labels={SCOPE_LABELS}
            onChange={setScope}
            options={SCOPES}
            value={scope}
          />
          <SelectField
            label="Mức xử lý"
            labels={ENFORCEMENT_LABELS}
            onChange={setEnforcement}
            options={ENFORCEMENTS}
            value={enforcement}
          />
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Ghi chú chung</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(e) => setNote(e.target.value)}
            value={note}
          />
        </label>
        <div className="flex gap-2">
          <Button disabled={isPending} onClick={runPreview} type="button" variant="ghost">
            Xem trước
          </Button>
          <Button disabled={isPending || !preview} onClick={runImport} type="button">
            Import
          </Button>
        </div>
        {preview ? (
          <>
            <p className="text-sm text-zinc-400">
              Hợp lệ: {preview.validCount} · Trùng: {preview.duplicateCount} · Lỗi:{" "}
              {preview.errorCount}
            </p>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 text-xs">
              <table className="min-w-full">
                <thead className="bg-white/[0.03] text-zinc-500">
                  <tr>
                    <th className="px-2 py-1">Dòng</th>
                    <th className="px-2 py-1">Giá trị</th>
                    <th className="px-2 py-1">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.lines.slice(0, 50).map((row) => (
                    <tr className="border-t border-white/5" key={row.line}>
                      <td className="px-2 py-1">{row.line}</td>
                      <td className="px-2 py-1 text-zinc-300">{row.value || "—"}</td>
                      <td className="px-2 py-1">
                        {row.valid ? (
                          <span className="text-emerald-300">OK</span>
                        ) : (
                          <span className="text-amber-300">{row.error ?? "Lỗi"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
        {message ? <p className="text-sm text-cyan-200">{message}</p> : null}
      </div>
    </ModalShell>
  );
}

export function ManualAssignModal({
  open,
  onClose,
  onSuccess,
  rules,
  capabilities,
  initialUserId
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rules: UsernamePolicyRuleRow[];
  capabilities: UsernamePolicyAdminCapabilities;
  initialUserId?: string | null;
}) {
  const [user, setUser] = useState<AdminUserSearchResult | null>(null);
  const [username, setUsername] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [exceptionRule, setExceptionRule] = useState<UsernamePolicyRuleRow | null>(null);
  const [checkResult, setCheckResult] = useState<Awaited<
    ReturnType<typeof checkUsernamePolicyAction>
  >["result"]>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !initialUserId) return;
    startTransition(async () => {
      const res = await searchAdminUsers({ query: initialUserId, pageSize: 1 });
      if (res.users[0]) setUser(res.users[0]);
    });
  }, [open, initialUserId]);

  if (!open) return null;
  if (!capabilities.canAssignUsername) {
    return (
      <ModalShell onClose={onClose} title="Gán username thủ công">
        <p className="text-sm text-zinc-400">Bạn không có quyền gán username.</p>
      </ModalShell>
    );
  }

  function runCheck() {
    startTransition(async () => {
      const res = await checkUsernamePolicyAction({
        username,
        userId: user?.id
      });
      setCheckResult(res.result);
    });
  }

  function submit() {
    if (!user || !reason.trim() || !confirmed) {
      setMessage("Chọn user, nhập lý do và xác nhận thao tác.");
      return;
    }
    startTransition(async () => {
      const res = await adminSetUserUsernameAction({
        userId: user.id,
        newUsername: username,
        changeReason: reason,
        createExceptionForRuleId: exceptionRule?.id ?? null
      });
      if (res.error) {
        setMessage(res.error);
        return;
      }
      onSuccess();
      onClose();
    });
  }

  return (
    <ModalShell onClose={onClose} title="Gán username thủ công">
      <div className="space-y-3">
        <UserPickerField onSelect={setUser} selected={user} />
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Username mới</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(e) => setUsername(e.target.value)}
            value={username}
          />
        </label>
        <Button disabled={isPending} onClick={runCheck} type="button" variant="ghost">
          Kiểm tra username
        </Button>
        {checkResult && !checkResult.username.valid ? (
          <div className="space-y-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm">
            <p className="text-amber-200">{checkResult.username.message}</p>
            <RulePickerField
              onSelect={setExceptionRule}
              rules={rules}
              selected={exceptionRule}
            />
            <p className="text-xs text-zinc-500">
              Có thể tạo ngoại lệ cho rule rồi gán username.
            </p>
          </div>
        ) : null}
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Lý do nội bộ *</span>
          <textarea
            className="min-h-20 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(e) => setReason(e.target.value)}
            value={reason}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} type="checkbox" />
          Tôi hiểu thao tác này sẽ đổi username của người dùng và ghi audit log.
        </label>
        {message ? <p className="text-sm text-amber-300">{message}</p> : null}
        <Button disabled={isPending} onClick={submit} type="button">
          Gán username
        </Button>
      </div>
    </ModalShell>
  );
}

export function AddExceptionModal({
  open,
  onClose,
  onSuccess,
  rules,
  preselectedRule,
  preselectedUserId
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rules: UsernamePolicyRuleRow[];
  preselectedRule?: UsernamePolicyRuleRow | null;
  preselectedUserId?: string | null;
}) {
  const [rule, setRule] = useState<UsernamePolicyRuleRow | null>(preselectedRule ?? null);
  const [user, setUser] = useState<AdminUserSearchResult | null>(null);
  const [exceptionScope, setExceptionScope] = useState<UsernamePolicyScope>("both");
  const [expiresAt, setExpiresAt] = useState("");
  const [noExpiry, setNoExpiry] = useState(true);
  const [reason, setReason] = useState("");
  const [publicNote, setPublicNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && preselectedRule) setRule(preselectedRule);
  }, [open, preselectedRule]);

  useEffect(() => {
    if (!open || !preselectedUserId) return;
    startTransition(async () => {
      const res = await searchAdminUsers({ query: preselectedUserId, pageSize: 1 });
      if (res.users[0]) setUser(res.users[0]);
    });
  }, [open, preselectedUserId]);

  if (!open) return null;

  function submit() {
    if (!rule || !user) {
      setMessage("Chọn rule và user.");
      return;
    }
    startTransition(async () => {
      const res = await addAllowedUserToRuleAction({
        ruleId: rule.id,
        userId: user.id,
        reason: reason || null,
        exceptionScope,
        expiresAt: noExpiry ? null : expiresAt ? `${expiresAt}T12:00:00.000Z` : null,
        publicNote: publicNote || null
      });
      if (res.error) setMessage(res.error);
      else {
        onSuccess();
        onClose();
      }
    });
  }

  return (
    <ModalShell onClose={onClose} title="Thêm ngoại lệ">
      <div className="space-y-3">
        <RulePickerField onSelect={setRule} rules={rules} selected={rule} />
        <UserPickerField onSelect={setUser} selected={user} />
        <SelectField
          label="Phạm vi ngoại lệ"
          labels={SCOPE_LABELS}
          onChange={setExceptionScope}
          options={SCOPES}
          value={exceptionScope}
        />
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input checked={noExpiry} onChange={(e) => setNoExpiry(e.target.checked)} type="checkbox" />
          Không hết hạn
        </label>
        {!noExpiry ? (
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">Hết hạn sau ngày</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              onChange={(e) => setExpiresAt(e.target.value)}
              type="date"
              value={expiresAt}
            />
          </label>
        ) : null}
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Lý do nội bộ</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(e) => setReason(e.target.value)}
            value={reason}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Ghi chú công khai (tuỳ chọn)</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(e) => setPublicNote(e.target.value)}
            value={publicNote}
          />
        </label>
        {message ? <p className="text-sm text-amber-300">{message}</p> : null}
        <Button disabled={isPending} onClick={submit} type="button">
          Thêm ngoại lệ
        </Button>
      </div>
    </ModalShell>
  );
}

export function EditRuleModal({
  open,
  rule,
  onClose,
  onSuccess
}: {
  open: boolean;
  rule: UsernamePolicyRuleRow | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [ruleType, setRuleType] = useState<UsernamePolicyRuleType>("protected_word");
  const [value, setValue] = useState("");
  const [matchType, setMatchType] = useState<UsernamePolicyMatchType>("contains");
  const [scope, setScope] = useState<UsernamePolicyScope>("both");
  const [enforcement, setEnforcement] = useState<UsernamePolicyEnforcementLevel>("block");
  const [priority, setPriority] = useState(0);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!rule) return;
    setRuleType(rule.rule_type);
    setValue(rule.value);
    setMatchType(rule.match_type);
    setScope(rule.scope);
    setEnforcement(rule.enforcement_level);
    setPriority(rule.priority);
    setNote(rule.note ?? "");
    setReason(rule.reason ?? "");
    setIsActive(rule.is_active);
  }, [rule]);

  if (!open || !rule) return null;

  function submit() {
    startTransition(async () => {
      const res = await editUsernamePolicyRuleAction({
        ruleId: rule!.id,
        ruleType,
        value,
        matchType,
        scope,
        enforcementLevel: enforcement,
        priority,
        note: note || null,
        reason: reason || null,
        isActive
      });
      if (res.error) {
        setMessage(res.error);
        return;
      }
      onSuccess();
      onClose();
    });
  }

  return (
    <ModalShell onClose={onClose} title="Sửa rule">
      <div className="space-y-3">
        <SelectField
          label="Loại rule"
          labels={RULE_TYPE_LABELS}
          onChange={setRuleType}
          options={RULE_TYPES}
          value={ruleType}
        />
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Giá trị</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(e) => setValue(e.target.value)}
            value={value}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Kiểu khớp"
            labels={MATCH_TYPE_LABELS}
            onChange={setMatchType}
            options={MATCH_TYPES}
            value={matchType}
          />
          <SelectField
            label="Phạm vi"
            labels={SCOPE_LABELS}
            onChange={setScope}
            options={SCOPES}
            value={scope}
          />
          <SelectField
            label="Mức xử lý"
            labels={ENFORCEMENT_LABELS}
            onChange={setEnforcement}
            options={ENFORCEMENTS}
            value={enforcement}
          />
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">Độ ưu tiên</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              onChange={(e) => setPriority(Number(e.target.value))}
              type="number"
              value={priority}
            />
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Ghi chú nội bộ</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(e) => setNote(e.target.value)}
            value={note}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Lý do / ghi chú thay đổi</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(e) => setReason(e.target.value)}
            value={reason}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input checked={isActive} onChange={(e) => setIsActive(e.target.checked)} type="checkbox" />
          Rule đang bật
        </label>
        {message ? <p className="text-sm text-amber-300">{message}</p> : null}
        <Button disabled={isPending} onClick={submit} type="button">
          Lưu thay đổi
        </Button>
      </div>
    </ModalShell>
  );
}
