"use client";

import { FeatureFlagSwitch } from "@/components/admin/monetization/FeatureFlagSwitch";
import { Input } from "@/components/ui";

type ContactChannelCardProps = {
  title: string;
  enabled: boolean;
  showEnabledState?: boolean;
  description: string;
  onToggle: (checked: boolean) => void;
  children: React.ReactNode;
};

export function ContactChannelCard({
  title,
  enabled,
  showEnabledState,
  description,
  onToggle,
  children
}: ContactChannelCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <FeatureFlagSwitch
        checked={enabled}
        description={description}
        label={`${title}${showEnabledState ? ` · ${enabled ? "Đang bật" : "Đang tắt"}` : ""}`}
        onChange={onToggle}
      />
      <div className={`mt-4 space-y-3 ${enabled ? "" : "opacity-50"}`}>{children}</div>
    </div>
  );
}

type ContactResetConfirmModalProps = {
  open: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ContactResetConfirmModal({
  open,
  pending,
  onConfirm,
  onCancel
}: ContactResetConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      aria-labelledby="reset-contact-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-white" id="reset-contact-title">
          Khôi phục mặc định?
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Tất cả cấu hình Liên hệ & Góp ý sẽ trở về giá trị mặc định của ChapMee.
          Thao tác này sẽ được ghi vào nhật ký audit.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-red-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
            disabled={pending}
            onClick={onConfirm}
            type="button"
          >
            {pending ? "Đang khôi phục…" : "Khôi phục mặc định"}
          </button>
          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/5 disabled:opacity-60"
            disabled={pending}
            onClick={onCancel}
            type="button"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContactStatusBadge({
  status
}: {
  status: "active" | "incomplete" | "disabled";
}) {
  const config = {
    active: {
      label: "Active",
      className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
    },
    incomplete: {
      label: "Incomplete",
      className: "border-amber-400/30 bg-amber-400/10 text-amber-100"
    },
    disabled: {
      label: "Disabled",
      className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
    }
  }[status];

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
}
