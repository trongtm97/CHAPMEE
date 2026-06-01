import type { ReactNode } from "react";
import type { FinanceSecurityEventType, PayoutVerificationStatus } from "@/types/finance";

export type FinanceTone = "cyan" | "green" | "amber" | "purple" | "blue" | "rose" | "slate";

const TONE = {
  cyan: {
    badge: "border-cyan-400/45 bg-cyan-500/15 text-cyan-50",
    card: "border-cyan-400/25 bg-gradient-to-br from-cyan-500/10 to-transparent",
    value: "text-cyan-100",
    button:
      "border-cyan-400/45 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30 focus-visible:outline-cyan-400"
  },
  green: {
    badge: "border-emerald-400/45 bg-emerald-500/15 text-emerald-50",
    card: "border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 to-transparent",
    value: "text-emerald-100",
    button:
      "border-emerald-400/45 bg-emerald-500/20 text-emerald-50 hover:bg-emerald-500/30 focus-visible:outline-emerald-400"
  },
  amber: {
    badge: "border-amber-400/45 bg-amber-500/15 text-amber-50",
    card: "border-amber-400/25 bg-gradient-to-br from-amber-500/10 to-transparent",
    value: "text-amber-100",
    button:
      "border-amber-400/45 bg-amber-500/15 text-amber-50 hover:bg-amber-500/25 focus-visible:outline-amber-400"
  },
  purple: {
    badge: "border-violet-400/45 bg-violet-500/15 text-violet-50",
    card: "border-violet-400/25 bg-gradient-to-br from-violet-500/10 to-transparent",
    value: "text-violet-100",
    button:
      "border-violet-400/45 bg-violet-500/20 text-violet-50 hover:bg-violet-500/30 focus-visible:outline-violet-400"
  },
  blue: {
    badge: "border-sky-400/45 bg-sky-500/15 text-sky-50",
    card: "border-sky-400/25 bg-gradient-to-br from-sky-500/10 to-transparent",
    value: "text-sky-100",
    button:
      "border-sky-400/45 bg-sky-500/20 text-sky-50 hover:bg-sky-500/30 focus-visible:outline-sky-400"
  },
  rose: {
    badge: "border-rose-400/45 bg-rose-500/15 text-rose-50",
    card: "border-rose-400/25 bg-gradient-to-br from-rose-500/10 to-transparent",
    value: "text-rose-100",
    button:
      "border-rose-400/45 bg-rose-500/15 text-rose-50 hover:bg-rose-500/25 focus-visible:outline-rose-400"
  },
  slate: {
    badge: "border-zinc-400/35 bg-zinc-600/20 text-zinc-200",
    card: "border-white/10 bg-white/[0.02]",
    value: "text-zinc-100",
    button:
      "border-zinc-500/40 bg-zinc-700/30 text-zinc-200 hover:bg-zinc-700/45 focus-visible:outline-zinc-400"
  }
} as const;

export function FinanceBadge({
  tone,
  children,
  className = ""
}: {
  tone: FinanceTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${TONE[tone].badge} ${className}`}
    >
      {children}
    </span>
  );
}

export function FinanceKpiCard({
  tone,
  label,
  value,
  hint
}: {
  tone: FinanceTone;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${TONE[tone].card}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${TONE[tone].value}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function FinanceSection({
  title,
  description,
  children,
  id
}: {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5" id={id}>
      <div className="mb-4">
        <h2 className="text-base font-bold text-zinc-100">{title}</h2>
        {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function FinanceAlert({
  tone,
  children
}: {
  tone: "amber" | "rose" | "green" | "cyan";
  children: ReactNode;
}) {
  const styles = {
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    rose: "border-rose-400/30 bg-rose-400/10 text-rose-100",
    green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 text-sm leading-relaxed ${styles[tone]}`}>
      {children}
    </div>
  );
}

export function FinanceButton({
  tone = "cyan",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: FinanceTone }) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${TONE[tone].button} ${className}`}
      type="button"
      {...props}
    />
  );
}

export function financeInputClass(disabled?: boolean) {
  return `h-10 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/40 ${disabled ? "opacity-60" : ""}`;
}

export function formatFinanceVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

export function payoutVerificationBadge(status: PayoutVerificationStatus): {
  tone: FinanceTone;
  label: string;
} {
  switch (status) {
    case "verified":
      return { tone: "green", label: "Đã xác thực" };
    case "pending_email":
      return { tone: "amber", label: "Chờ xác thực email" };
    case "needs_reverification":
      return { tone: "purple", label: "Cần xác thực lại" };
    case "rejected":
      return { tone: "rose", label: "Bị từ chối" };
    default:
      return { tone: "slate", label: "Chưa xác thực" };
  }
}

const SECURITY_EVENT_LABELS: Record<FinanceSecurityEventType, string> = {
  withdrawal_pin_set: "Thiết lập PIN rút tiền",
  withdrawal_pin_changed: "Đổi PIN rút tiền",
  withdrawal_pin_failed: "Nhập sai PIN",
  withdrawal_pin_reset: "Quên PIN / đặt lại PIN",
  payout_profile_created: "Tạo hồ sơ nhận tiền",
  payout_profile_changed: "Cập nhật hồ sơ nhận tiền",
  payout_verification_requested: "Yêu cầu xác thực nhận tiền",
  payout_verification_completed: "Hoàn tất xác thực nhận tiền",
  payout_bank_change_locked: "Khóa rút 24h sau đổi ngân hàng",
  bank_account_added: "Thêm tài khoản ngân hàng",
  bank_account_updated: "Sửa tài khoản ngân hàng",
  bank_account_deleted: "Xóa tài khoản ngân hàng",
  bank_account_default_set: "Đặt tài khoản mặc định",
  bank_account_email_verified: "Xác nhận email tài khoản",
  finance_email_code_sent: "Gửi mã xác nhận email",
  withdrawal_requested: "Gửi yêu cầu rút tiền",
  withdrawal_canceled: "Huỷ yêu cầu rút tiền"
};

export function financeSecurityEventLabel(type: FinanceSecurityEventType): string {
  return SECURITY_EVENT_LABELS[type] ?? type;
}
