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
      <SectionHeader title="Nap coin" />
      <Card>
        <p className="text-sm text-zinc-300">
          Nen tang hien tai khong ho tro nap coin bang web payment tren build nay.
        </p>
      </Card>
    </section>
  );
}
