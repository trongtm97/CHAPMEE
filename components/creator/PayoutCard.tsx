import { Card, SectionHeader } from "@/components/ui";
import { PayoutRequestForm } from "@/components/creator/PayoutRequestForm";
import type { CreatorMonetizationProfile } from "@/types/creator-monetization";
import type { CreatorPayoutAccount, PayoutMethod, PayoutRequest } from "@/types/payout";
import type { CreatorWallet } from "@/types/wallet";

type PayoutCardProps = {
  payoutEnabled: boolean;
  minWithdrawAmountVnd: number;
  allowedMethods: PayoutMethod[];
  processingNote: string;
  kycRequired: boolean;
  creatorProfile: CreatorMonetizationProfile | null;
  wallet: CreatorWallet;
  payoutAccounts: CreatorPayoutAccount[];
  requests: PayoutRequest[];
};

export function PayoutCard({
  payoutEnabled,
  minWithdrawAmountVnd,
  allowedMethods,
  processingNote,
  kycRequired,
  creatorProfile,
  wallet,
  payoutAccounts,
  requests
}: PayoutCardProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        title="Payout"
        subtitle="Yêu cầu rút tiền thủ công, ưu tiên an toàn và kiểm duyệt."
      />
      <Card className="space-y-4">
        <PayoutRequestForm
          accounts={payoutAccounts}
          allowedMethods={allowedMethods}
          availableRevenueVnd={wallet.available_revenue_vnd}
          creatorApproved={
            Boolean(creatorProfile?.monetization_enabled) &&
            creatorProfile?.status === "approved"
          }
          kycRequired={kycRequired}
          kycVerified={creatorProfile?.kyc_status === "verified"}
          minWithdrawAmountVnd={minWithdrawAmountVnd}
          payoutEnabled={payoutEnabled}
          processingNote={processingNote}
        />

        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">Yêu cầu gần đây</p>
          {requests.length === 0 ? (
            <p className="text-sm text-zinc-400">Chưa có yêu cầu payout nào.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm"
                  key={request.id}
                >
                  <span className="text-zinc-100">{request.amount_vnd.toLocaleString("vi-VN")} VND</span>
                  <span className="text-zinc-300">{request.method}</span>
                  <span className="text-zinc-300">{request.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
