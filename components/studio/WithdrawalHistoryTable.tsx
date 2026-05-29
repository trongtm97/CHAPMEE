import type { WithdrawalHistoryRow } from "@/types/finance";

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

const STATUS_CLASS: Record<string, string> = {
  pending: "text-amber-300",
  approved: "text-sky-300",
  processing: "text-blue-300",
  paid: "text-emerald-300",
  rejected: "text-red-300",
  failed: "text-red-400",
  canceled: "text-zinc-400"
};

type WithdrawalHistoryTableProps = {
  rows: WithdrawalHistoryRow[];
};

export function WithdrawalHistoryTable({ rows }: WithdrawalHistoryTableProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
      <h2 className="text-base font-bold text-white">Lịch sử yêu cầu rút tiền</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Chưa có yêu cầu rút tiền.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-zinc-500">Mã yêu cầu</p>
                  <p className="font-mono text-sm text-zinc-200">{row.id.slice(0, 8)}…</p>
                </div>
                <p
                  className={`text-sm font-semibold ${STATUS_CLASS[row.status] ?? "text-zinc-300"}`}
                >
                  {row.statusLabel}
                </p>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-zinc-500">Số tiền</dt>
                  <dd className="font-semibold text-white">{formatVnd(row.amountVnd)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Phương thức</dt>
                  <dd>{row.methodLabel}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-zinc-500">Nhận tiền (đã ẩn)</dt>
                  <dd>{row.payoutMasked}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Ngày yêu cầu</dt>
                  <dd>{formatDate(row.requestedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Ngày xử lý</dt>
                  <dd>{formatDate(row.processedAt)}</dd>
                </div>
              </dl>
              {row.adminNote ? (
                <p className="mt-2 text-xs text-amber-200/90">Ghi chú admin: {row.adminNote}</p>
              ) : null}
              {row.creatorNote ? (
                <p className="mt-1 text-xs text-zinc-500">Ghi chú của bạn: {row.creatorNote}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
