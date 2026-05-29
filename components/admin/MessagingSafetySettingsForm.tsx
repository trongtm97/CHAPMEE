"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import {
  updateMessageSafetySettingsAction,
  upsertKeywordRuleAction
} from "@/lib/admin/messaging-safety-actions";
import { DM_POLICY_LABELS } from "@/lib/messaging/labels";
import type { DefaultDmPolicy, MessageSafetySettings } from "@/types/messaging-safety";

type Props = {
  settings: MessageSafetySettings;
  keywordRules: {
    id: string;
    keyword: string;
    action: string;
    severity: string;
    category: string | null;
    isActive: boolean;
    createdAt: string;
  }[];
  moderatorId: string;
};

export function MessagingSafetySettingsForm({
  settings,
  keywordRules,
  moderatorId
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(settings);
  const [newKeyword, setNewKeyword] = useState("");
  const [newAction, setNewAction] = useState<"block" | "review" | "allow">("block");

  function saveSettings() {
    startTransition(async () => {
      await updateMessageSafetySettingsAction({
        moderatorId,
        settingsId: form.id,
        patch: form
      });
      router.refresh();
    });
  }

  function addKeyword() {
    if (!newKeyword.trim()) return;
    startTransition(async () => {
      await upsertKeywordRuleAction({
        moderatorId,
        keyword: newKeyword,
        action: newAction,
        severity: "medium",
        category: "spam"
      });
      setNewKeyword("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-4">
        <h3 className="font-semibold text-white">Quyền nhắn tin mặc định</h3>
        <select
          className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-2 py-2 text-sm"
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              defaultDmPolicy: e.target.value as DefaultDmPolicy
            }))
          }
          value={form.defaultDmPolicy}
        >
          {(Object.entries(DM_POLICY_LABELS) as [DefaultDmPolicy, string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            )
          )}
        </select>

        <h3 className="font-semibold text-white">Tài khoản mới & xác minh</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Số ngày coi là tài khoản mới"
            onChange={(v) => setForm((f) => ({ ...f, newAccountDays: v }))}
            value={form.newAccountDays}
          />
          <NumberField
            label="Tin/ngày (chưa xác minh)"
            onChange={(v) => setForm((f) => ({ ...f, unverifiedDailyMessageLimit: v }))}
            value={form.unverifiedDailyMessageLimit}
          />
          <NumberField
            label="Tin/ngày (đã xác minh)"
            onChange={(v) => setForm((f) => ({ ...f, verifiedDailyMessageLimit: v }))}
            value={form.verifiedDailyMessageLimit}
          />
          <NumberField
            label="Tin/ngày (trusted)"
            onChange={(v) => setForm((f) => ({ ...f, trustedDailyMessageLimit: v }))}
            value={form.trustedDailyMessageLimit}
          />
        </div>

        <h3 className="font-semibold text-white">Rate limit</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Tin tối đa / phút"
            onChange={(v) => setForm((f) => ({ ...f, maxMessagesPerMinute: v }))}
            value={form.maxMessagesPerMinute}
          />
          <NumberField
            label="Tin tối đa / ngày"
            onChange={(v) => setForm((f) => ({ ...f, maxMessagesPerDay: v }))}
            value={form.maxMessagesPerDay}
          />
          <NumberField
            label="Người nhận mới / ngày"
            onChange={(v) => setForm((f) => ({ ...f, maxNewRecipientsPerDay: v }))}
            value={form.maxNewRecipientsPerDay}
          />
          <NumberField
            label="Tin giống nhau / ngày"
            onChange={(v) => setForm((f) => ({ ...f, duplicateMessageLimitPerDay: v }))}
            value={form.duplicateMessageLimitPerDay}
          />
        </div>

        <h3 className="font-semibold text-white">Link & tác giả</h3>
        <div className="space-y-2 text-sm text-zinc-300">
          <Toggle
            checked={form.blockExternalLinksForNewUsers}
            label="Chặn link ngoài (tài khoản mới)"
            onChange={(v) =>
              setForm((f) => ({ ...f, blockExternalLinksForNewUsers: v }))
            }
          />
          <Toggle
            checked={form.blockExternalLinksForUnverified}
            label="Chặn link ngoài (chưa xác minh)"
            onChange={(v) =>
              setForm((f) => ({ ...f, blockExternalLinksForUnverified: v }))
            }
          />
          <Toggle
            checked={form.allowInternalLinks}
            label="Cho phép link nội bộ ChapMee"
            onChange={(v) => setForm((f) => ({ ...f, allowInternalLinks: v }))}
          />
          <Toggle
            checked={form.authorProtectionEnabled}
            label="Bật bảo vệ tác giả"
            onChange={(v) => setForm((f) => ({ ...f, authorProtectionEnabled: v }))}
          />
          <NumberField
            label="Tài khoản mới → tác giả (tin/ngày)"
            onChange={(v) => setForm((f) => ({ ...f, authorDmNewUserLimit: v }))}
            value={form.authorDmNewUserLimit}
          />
        </div>

        <Button disabled={pending} onClick={saveSettings} type="button">
          Lưu cấu hình
        </Button>
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="font-semibold text-white">Từ khóa an toàn</h3>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[160px] flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Từ khóa"
            value={newKeyword}
          />
          <select
            className="rounded-lg border border-white/10 bg-[#0b1016] px-2 py-2 text-sm"
            onChange={(e) => setNewAction(e.target.value as typeof newAction)}
            value={newAction}
          >
            <option value="block">Chặn</option>
            <option value="review">Duyệt</option>
            <option value="allow">Cho phép</option>
          </select>
          <Button disabled={pending} onClick={addKeyword} type="button" variant="secondary">
            Thêm
          </Button>
        </div>
        <ul className="space-y-1 text-sm text-zinc-400">
          {keywordRules.map((rule) => (
            <li key={rule.id}>
              <span className="text-zinc-200">{rule.keyword}</span> → {rule.action}
              {!rule.isActive ? " (tắt)" : ""}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-xs text-zinc-500">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-zinc-200"
        min={0}
        onChange={(e) => onChange(Number(e.target.value))}
        type="number"
        value={value}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input checked={checked} onChange={(e) => onChange(e.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}
