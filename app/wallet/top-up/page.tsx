import { redirect } from "next/navigation";
import { Card, SectionHeader } from "@/components/ui";
import { getPurchaseUiPolicyForRequest } from "@/lib/payments/purchase-mode";

export const dynamic = "force-dynamic";

export default async function WalletTopUpPage() {
  const purchasePolicy = await getPurchaseUiPolicyForRequest();

  if (purchasePolicy.showSePayTopUp) {
    redirect("/coin/checkout");
  }

  return (
    <section className="space-y-4">
      <SectionHeader title="Nạp Xu" />
      <Card>
        <p className="text-sm text-zinc-300">
          Nền tảng hiện tại không hỗ trợ nạp Xu bằng web payment trên build này.
        </p>
      </Card>
    </section>
  );
}
