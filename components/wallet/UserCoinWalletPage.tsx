import { UserCoinLedgerTable } from "@/components/admin/UserCoinLedgerTable";
import { Card, SectionHeader } from "@/components/ui";
import { getUserCoinBalance } from "@/lib/coins/get-user-coin-balance";
import { getUserCoinLedger } from "@/lib/coins/get-user-coin-ledger";

type UserCoinWalletPageProps = {
  userId: string;
};

export async function UserCoinWalletHistory({ userId }: UserCoinWalletPageProps) {
  const [balance, ledger] = await Promise.all([
    getUserCoinBalance(userId),
    getUserCoinLedger({ userId, limit: 40 })
  ]);

  if (!balance.data) {
    return null;
  }

  return (
    <Card className="space-y-4">
      <SectionHeader
        subtitle="Số dư và lịch sử từ sổ coin ledger."
        title="Lịch sử coin"
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Coin đã mua</p>
          <p className="mt-1 text-2xl font-black text-white">
            {balance.data.walletPaid.toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Coin thưởng</p>
          <p className="mt-1 text-2xl font-black text-white">
            {balance.data.walletBonus.toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-4">
          <p className="text-xs uppercase tracking-wide text-cyan-100">Tổng khả dụng</p>
          <p className="mt-1 text-2xl font-black text-cyan-100">
            {balance.data.walletTotal.toLocaleString("vi-VN")} coin
          </p>
        </div>
      </div>
      <UserCoinLedgerTable entries={ledger.entries} />
    </Card>
  );
}
