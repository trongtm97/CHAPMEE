"use client";

import type { PublishChecklistRule } from "@/types/publish-checklist";

type PublishChecklistProps = {
  rules: PublishChecklistRule[];
  compact?: boolean;
};

function groupRules(rules: PublishChecklistRule[]) {
  const errors = rules.filter((rule) => rule.status === "error");
  const warnings = rules.filter((rule) => rule.status === "warning");
  const passed = rules.filter((rule) => rule.status === "pass");

  return { errors, passed, warnings };
}

function RuleList({
  items,
  tone
}: {
  items: PublishChecklistRule[];
  tone: "error" | "warning" | "pass";
}) {
  if (items.length === 0) {
    return null;
  }

  const toneClass =
    tone === "error"
      ? "border-rose-400/30 bg-rose-400/10 text-rose-100"
      : tone === "warning"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
        : "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";

  return (
    <ul className={`space-y-2 rounded-xl border p-3 ${toneClass}`}>
      {items.map((rule) => (
        <li className="text-sm" key={rule.id}>
          <p className="font-medium">{rule.label}</p>
          {rule.message && rule.status !== "pass" ? (
            <p className="mt-0.5 text-xs opacity-90">{rule.message}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function PublishChecklist({ compact = false, rules }: PublishChecklistProps) {
  const { errors, warnings, passed } = groupRules(rules);

  if (rules.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Đang tải checklist…
      </p>
    );
  }

  if (errors.length === 0 && warnings.length === 0 && passed.length > 0) {
    return (
      <div className="space-y-2">
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-100">
          Đã đạt — sẵn sàng đăng hoặc lên lịch.
        </p>
        {!compact ? <RuleList items={passed} tone="pass" /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errors.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-rose-200">Cần sửa</h3>
          <p className="text-xs text-zinc-500">
            Không thể đăng cho đến khi sửa các mục bắt buộc.
          </p>
          <RuleList items={errors} tone="error" />
        </section>
      ) : null}

      {warnings.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-amber-200">Nên cải thiện</h3>
          <RuleList items={warnings} tone="warning" />
        </section>
      ) : null}

      {!compact && passed.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-emerald-200">Đã đạt</h3>
          <RuleList items={passed} tone="pass" />
        </section>
      ) : null}
    </div>
  );
}

export function publishChecklistHasBlockingErrors(rules: PublishChecklistRule[]) {
  return rules.some((rule) => rule.status === "error" && rule.blocking);
}

export function publishChecklistHasWarnings(rules: PublishChecklistRule[]) {
  return rules.some((rule) => rule.status === "warning");
}
