import type { FinanceSecurityLogRow } from "@/types/finance";

const EVENT_LABELS: Record<string, string> = {
  withdrawal_pin_set: "Thiết lập PIN rút tiền",
  withdrawal_pin_changed: "Đổi PIN rút tiền",
  withdrawal_pin_failed: "Nhập PIN sai",
  payout_profile_created: "Tạo thông tin nhận tiền",
  payout_profile_changed: "Cập nhật thông tin nhận tiền",
  withdrawal_requested: "Gửi yêu cầu rút tiền",
  withdrawal_canceled: "Hủy yêu cầu rút tiền"
};

type FinanceSecurityLogsProps = {
  logs: FinanceSecurityLogRow[];
};

export function FinanceSecurityLogs({ logs }: FinanceSecurityLogsProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
      <h2 className="text-base font-bold text-white">Lịch sử bảo mật tài chính</h2>
      {logs.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Chưa có sự kiện bảo mật.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-white/5 px-3 py-2 text-sm"
            >
              <span className="text-zinc-200">
                {EVENT_LABELS[log.event_type] ?? log.event_type}
              </span>
              <time className="text-xs text-zinc-500">
                {new Date(log.created_at).toLocaleString("vi-VN")}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
