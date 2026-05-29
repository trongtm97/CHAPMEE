"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { createUsernamePolicyRuleAction } from "@/lib/admin/create-username-policy-rule";
import type {
  UsernamePolicyMatchType,
  UsernamePolicyRuleType,
  UsernamePolicyScope
} from "@/types/username-policy";

type UsernameRuleFormProps = {
  defaultRuleType?: UsernamePolicyRuleType;
  onCreated?: () => void;
};

export function UsernameRuleForm({
  defaultRuleType = "protected_word",
  onCreated
}: UsernameRuleFormProps) {
  const [ruleType, setRuleType] = useState<UsernamePolicyRuleType>(defaultRuleType);
  const [value, setValue] = useState("");
  const [matchType, setMatchType] = useState<UsernamePolicyMatchType>("contains");
  const [scope, setScope] = useState<UsernamePolicyScope>("both");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createUsernamePolicyRuleAction({
        ruleType,
        value,
        matchType,
        scope,
        note: note || null
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setValue("");
      setNote("");
      setMessage("Đã thêm rule.");
      onCreated?.();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-sm font-semibold text-white">Thêm rule mới</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Loại</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(event) => setRuleType(event.target.value as UsernamePolicyRuleType)}
            value={ruleType}
          >
            <option value="banned_username">Username bị cấm</option>
            <option value="reserved_username">Username giữ chỗ</option>
            <option value="protected_word">Từ được bảo vệ</option>
            <option value="banned_display_name_word">Từ cấm tên hiển thị</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Giá trị</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(event) => setValue(event.target.value)}
            placeholder="official, son-tung..."
            value={value}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Kiểu khớp</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(event) => setMatchType(event.target.value as UsernamePolicyMatchType)}
            value={matchType}
          >
            <option value="exact">exact</option>
            <option value="contains">contains</option>
            <option value="starts_with">starts_with</option>
            <option value="regex">regex</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Phạm vi</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(event) => setScope(event.target.value as UsernamePolicyScope)}
            value={scope}
          >
            <option value="username">username</option>
            <option value="display_name">display_name</option>
            <option value="both">both</option>
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="text-zinc-400">Ghi chú</span>
        <input
          className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
          onChange={(event) => setNote(event.target.value)}
          value={note}
        />
      </label>
      <Button disabled={isPending} onClick={submit} type="button">
        {isPending ? "Đang lưu..." : "Thêm rule"}
      </Button>
      {message ? <p className="text-sm text-cyan-200">{message}</p> : null}
    </div>
  );
}
