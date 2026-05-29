import Link from "next/link";
import { redirect } from "next/navigation";
import { ErrorState } from "@/components/ui";
import { SePayCheckoutPanel } from "@/components/payments/SePayCheckoutPanel";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCheckoutSessionById } from "@/lib/supabase/checkout-sessions";
import { getSePayConfig, maskAccountNumber } from "@/lib/payments/sepay-config";

type CheckoutPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CheckoutDetailPage({ params }: CheckoutPageProps) {
  const { id } = await params;
  const [{ profile }, sessionResult] = await Promise.all([getCurrentUser(), getCheckoutSessionById(id)]);
  if (!profile) redirect(`/login?next=/checkout/${id}`);
  if (!sessionResult.data) {
    return <ErrorState title="Checkout not found" message={sessionResult.error} />;
  }
  if (sessionResult.data.user_id !== profile.id && profile.role !== "admin" && profile.role !== "founder") {
    return <ErrorState title="Forbidden" message="Ban khong co quyen xem checkout nay." />;
  }

  const sepay = getSePayConfig();
  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/coin/checkout">
          ← Quay lai nap coin
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Checkout</h1>
      </div>

      {!sepay.ready ? (
        <ErrorState title="SePay chua cau hinh day du" message={`Missing env: ${sepay.missing.join(", ")}`} />
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-200">
        <p>Ngan hang: {sepay.config.bankCode || "-"}</p>
        <p>So tai khoan: {maskAccountNumber(sepay.config.bankAccountNumber || "-")}</p>
        <p>Chu tai khoan: {sepay.config.bankAccountName || "-"}</p>
      </div>

      <SePayCheckoutPanel initialSession={sessionResult.data} />
    </section>
  );
}
