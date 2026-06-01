import Link from "next/link";

type FinancePageHeaderProps = {
  canWithdraw: boolean;
};

export function FinancePageHeader({ canWithdraw }: FinancePageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-black text-white">Tài chính</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
          Theo dõi số dư, doanh thu, thông tin nhận tiền và yêu cầu rút tiền.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          className="inline-flex h-9 items-center rounded-lg border border-white/10 bg-zinc-900/80 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
          href="/studio/monetization"
        >
          Cài đặt kiếm tiền
        </Link>
        <a
          className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
            canWithdraw
              ? "border-cyan-400/45 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30 focus-visible:outline-cyan-400"
              : "pointer-events-none border-white/10 bg-zinc-800/50 text-zinc-500 opacity-60"
          }`}
          href={canWithdraw ? "#withdrawal-request" : undefined}
          title={canWithdraw ? undefined : "Chưa đủ điều kiện rút tiền"}
        >
          Yêu cầu rút tiền
        </a>
      </div>
    </div>
  );
}
