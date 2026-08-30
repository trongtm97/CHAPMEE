import Link from "next/link";
import { ErrorState, SectionHeader } from "@/components/ui";
import { PayoutReviewTable } from "@/components/admin/payouts/PayoutReviewTable";
import { requirePayoutViewAccess } from "@/lib/auth/require-permission";
import { listPayoutRequestsForAdmin } from "@/lib/data/payouts";
import { getOrCreateCreatorWallet } from "@/lib/wallets/creator-wallet";
import type { CreatorWallet } from "@/types/wallet";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  const guard = await requirePayoutViewAccess("/admin/payouts");
  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Không có quyền truy cập" subtitle="Chỉ dành cho quản trị viên hoặc founder." />
        <ErrorState message={guard.error} title="Không có quyền truy cập admin" variant="danger" />
      </section>
    );
  }

  const requestsResult = await listPayoutRequestsForAdmin(200);
  const creatorIds = Array.from(
    new Set(requestsResult.data.map((item) => item.creator_user_id))
  );
  const wallets = await Promise.all(
    creatorIds.map(async (creatorUserId) => ({
      creatorUserId,
      wallet: await getOrCreateCreatorWallet(creatorUserId)
    }))
  );
  const walletsByCreator = wallets.reduce(
    (acc, item) => {
      if (item.wallet.data) {
        acc[item.creatorUserId] = item.wallet.data;
      }
      return acc;
    },
    {} as Record<string, CreatorWallet>
  );

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Payout Reviews</h1>
      </div>
      {requestsResult.error ? (
        <ErrorState message={requestsResult.error} title="Không tải được yêu cầu rút tiền" />
      ) : (
        <PayoutReviewTable
          requests={requestsResult.data}
          walletsByCreator={walletsByCreator}
        />
      )}
    </section>
  );
}
