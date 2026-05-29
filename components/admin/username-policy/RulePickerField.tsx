"use client";

import { useMemo, useState } from "react";
import { ruleTypeLabel } from "@/lib/admin/username-policy-labels";
import type { UsernamePolicyRuleRow } from "@/types/username-policy";

type Props = {
  rules: UsernamePolicyRuleRow[];
  selected: UsernamePolicyRuleRow | null;
  onSelect: (rule: UsernamePolicyRuleRow | null) => void;
  disabled?: boolean;
};

export function RulePickerField({ rules, selected, onSelect, disabled }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rules.slice(0, 30);
    return rules
      .filter(
        (r) =>
          r.value.toLowerCase().includes(q) ||
          r.normalized_value.toLowerCase().includes(q) ||
          r.id === q
      )
      .slice(0, 30);
  }, [query, rules]);

  return (
    <div className="space-y-2">
      <span className="text-sm text-zinc-400">Chọn rule</span>
      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-sm">
          <span className="text-white">
            {selected.value}{" "}
            <span className="text-zinc-500">({ruleTypeLabel(selected.rule_type)})</span>
          </span>
          <button
            className="text-xs text-zinc-400 hover:text-white"
            disabled={disabled}
            onClick={() => onSelect(null)}
            type="button"
          >
            Đổi
          </button>
        </div>
      ) : (
        <>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo giá trị rule..."
            value={query}
          />
          {filtered.length > 0 ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/10 p-1">
              {filtered.map((rule) => (
                <li key={rule.id}>
                  <button
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-white/5"
                    onClick={() => onSelect(rule)}
                    type="button"
                  >
                    {rule.value}{" "}
                    <span className="text-zinc-500">{ruleTypeLabel(rule.rule_type)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
