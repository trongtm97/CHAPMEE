import { UserCoinLedgerTable } from "@/components/admin/UserCoinLedgerTable";
import { Card, SectionHeader } from "@/components/ui";
import { getUserCoinLedger } from "@/lib/coins/get-user-coin-ledger";

type UserCoinWalletPageProps = {
  userId: string;
};

export async function UserCoinWalletHistory({ userId }: UserCoinWalletPageProps) {
  try {
    const ledger = await getUserCoinLedger({ userId, limit: 8 });

    return (
      <Card className="space-y-4">
        <SectionHeader
          subtitle="Các giao dịch Xu gần đây, gọn và dễ quét."
          title="Lịch sử giao dịch"
        />
        <UserCoinLedgerTable
          emptyMessage="Chưa có giao dịch Xu nào. Khi bạn nạp hoặc sử dụng Xu, lịch sử sẽ hiện ở đây."
          entries={ledger.entries}
        />
      </Card>
    );
  } catch {
    return null;
  }
}
