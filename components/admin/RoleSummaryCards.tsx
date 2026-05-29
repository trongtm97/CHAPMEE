"use client";

import type { RoleCenterSummary, RoleAdminTab } from "@/types/admin-roles";

const CARDS: { key: keyof RoleCenterSummary; label: string; tab?: RoleAdminTab }[] = [
  { key: "totalRoles", label: "Tổng số vai trò", tab: "roles" },
  { key: "systemRoles", label: "Vai trò hệ thống", tab: "roles" },
  { key: "financeRoles", label: "Vai trò có quyền tài chính", tab: "sensitive" },
  { key: "moderationRoles", label: "Vai trò có quyền kiểm duyệt", tab: "sensitive" },
  { key: "userAdminRoles", label: "Vai trò có quyền quản trị user", tab: "roles" },
  { key: "adminUsers", label: "User có quyền admin", tab: "users" },
  { key: "changes7d", label: "Thay đổi phân quyền 7 ngày", tab: "audit" },
  { key: "emptyPermissionRoles", label: "Role không có quyền", tab: "roles" }
];

type Props = {
  summary: RoleCenterSummary;
  onSelectTab?: (tab: RoleAdminTab) => void;
};

export function RoleSummaryCards({ summary, onSelectTab }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {CARDS.map((card) => (
        <button
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-cyan-400/30"
          key={card.key}
          onClick={() => card.tab && onSelectTab?.(card.tab)}
          type="button"
        >
          <p className="text-xl font-bold text-white">
            {new Intl.NumberFormat("vi-VN").format(summary[card.key])}
          </p>
          <p className="mt-0.5 text-[11px] leading-tight text-zinc-400">{card.label}</p>
        </button>
      ))}
    </div>
  );
}
