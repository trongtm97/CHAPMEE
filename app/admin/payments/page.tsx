import Link from "next/link";
import { ErrorState } from "@/components/ui";
import { PaymentDashboard } from "@/components/admin/payments/PaymentDashboard";
import { requireFinanceAccess } from "@/lib/auth/require-permission";
import { listCheckoutSessionsForAdmin } from "@/lib/supabase/checkout-sessions";
import { listPaymentWebhookEventsForAdmin } from "@/lib/supabase/payment-webhook-events";
import { getSePayConfig } from "@/lib/payments/sepay-config";

type AdminPaymentsPageProps = {
  searchParams: Promise<{
    provider?: string;
    status?: string;
    checkout_code?: string;
    user_id?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({ searchParams }: AdminPaymentsPageProps) {
  const params = await searchParams;
  const guard = await requireFinanceAccess("/admin/payments");
  if (!guard.ok) {
    return <ErrorState title="Không có quyền truy cập admin" message={guard.error} variant="danger" />;
  }

  const [sessions, webhookEvents] = await Promise.all([
    listCheckoutSessionsForAdmin(100, {
      provider: params.provider,
      status: params.status,
      checkoutCode: params.checkout_code,
      userId: params.user_id
    }),
    listPaymentWebhookEventsForAdmin(100)
  ]);
  const sepay = getSePayConfig();

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <p className="mt-5 text-sm font-medium uppercase tracking-wide text-cyan-300">Admin</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Payments</h1>
      </div>

      {!sepay.ready ? (
        <ErrorState
          title="SePay provider chua cau hinh day du"
          message={`Missing env: ${sepay.missing.join(", ")}`}
          variant="warning"
        />
      ) : null}

      <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-4">
        <input
          className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          defaultValue={params.provider ?? ""}
          name="provider"
          placeholder="provider"
        />
        <input
          className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          defaultValue={params.status ?? ""}
          name="status"
          placeholder="status"
        />
        <input
          className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          defaultValue={params.checkout_code ?? ""}
          name="checkout_code"
          placeholder="checkout_code"
        />
        <button className="rounded-xl bg-cyan-300 px-3 py-2 text-sm font-bold text-zinc-950" type="submit">
          Loc
        </button>
      </form>

      {sessions.error ? <ErrorState title="Không tải được phiên checkout" message={sessions.error} /> : null}
      {webhookEvents.error ? <ErrorState title="Không tải được sự kiện webhook" message={webhookEvents.error} /> : null}

      <PaymentDashboard sessions={sessions.data} webhookEvents={webhookEvents.data} />
    </section>
  );
}
