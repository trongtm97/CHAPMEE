"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  deleteKeywordRuleAction,
  upsertKeywordRuleAction
} from "@/lib/admin/moderation-keyword-actions";
import type { ModerationKeywordRule } from "@/types/community-auto-moderation";

type ModerationKeywordRulesTableProps = {
  rules: ModerationKeywordRule[];
  canEdit: boolean;
};

const emptyRule = (): Omit<ModerationKeywordRule, "createdAt"> => ({
  id: "",
  keyword: "",
  matchType: "contains",
  action: "review",
  category: null,
  severity: "medium",
  isActive: true
});

export function ModerationKeywordRulesTable({
  rules,
  canEdit
}: ModerationKeywordRulesTableProps) {
  const [draft, setDraft] = useState(emptyRule());
  const [pending, setPending] = useState(false);

  if (!canEdit) {
    return (
      <p className="text-sm text-zinc-500">Không có quyền chỉnh từ khóa.</p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
        {rules.length === 0 ? (
          <li className="px-4 py-3 text-sm text-zinc-500">Chưa có từ khóa.</li>
        ) : (
          rules.map((rule) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              key={rule.id}
            >
              <span className="text-white">
                {rule.keyword}{" "}
                <span className="text-zinc-500">
                  ({rule.action} · {rule.severity})
                </span>
              </span>
              <Button
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  await deleteKeywordRuleAction(rule.id);
                  setPending(false);
                }}
                type="button"
                variant="ghost"
              >
                Xóa
              </Button>
            </li>
          ))
        )}
      </ul>

      <div className="grid gap-2 rounded-xl border border-white/10 p-4 sm:grid-cols-2">
        <input
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
          onChange={(e) => setDraft((d) => ({ ...d, keyword: e.target.value }))}
          placeholder="Từ khóa"
          value={draft.keyword}
        />
        <select
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              action: e.target.value as ModerationKeywordRule["action"]
            }))
          }
          value={draft.action}
        >
          <option value="block">Chặn (block)</option>
          <option value="review">Duyệt tay (review)</option>
          <option value="allow">Cho phép (allow)</option>
        </select>
        <select
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              severity: e.target.value as ModerationKeywordRule["severity"]
            }))
          }
          value={draft.severity}
        >
          <option value="low">Thấp</option>
          <option value="medium">Trung bình</option>
          <option value="high">Cao</option>
        </select>
        <Button
          disabled={pending || !draft.keyword.trim()}
          onClick={async () => {
            setPending(true);
            await upsertKeywordRuleAction(draft);
            setDraft(emptyRule());
            setPending(false);
          }}
          type="button"
          variant="primary"
        >
          Thêm từ khóa
        </Button>
      </div>
    </div>
  );
}
