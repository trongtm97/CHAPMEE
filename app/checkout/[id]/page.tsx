import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ErrorState } from "@/components/ui";
import { SePayCheckoutPanel } from "@/components/payments/SePayCheckoutPanel";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCheckoutSessionById } from "@/lib/data/checkout-sessions";
import { getSePayRuntimeConfig } from "@/lib/payments/sepay-config";
import { STUDIO_NOINDEX_ROBOTS } from "@/lib/seo/should-index";

export const metadata: Metadata = {
  robots: STUDIO_NOINDEX_ROBOTS
};

type CheckoutPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CheckoutDetailPage({ params }: CheckoutPageProps) {
  const { id } = await params;
  const [{ profile }, sessionResult] = await Promise.all([getCurrentUser(), getCheckoutSessionById(id)]);

  if (!profile) redirect(`/login?next=/checkout/${id}`);

  if (!sessionResult.data) {
    return <ErrorState message={sessionResult.error} title="Không tìm thấy phiên thanh toán" />;
  }

  if (
    sessionResult.data.user_id !== profile.id &&
    profile.role !== "admin" &&
    profile.role !== "founder"
  ) {
    return (
      <ErrorState
        message="Bạn không có quyền xem phiên thanh toán này."
        title="Không thể truy cập"
        variant="danger"
      />
    );
  }

  const sepay = await getSePayRuntimeConfig();

  return (
    <section className="space-y-4">
      <header className="space-y-2.5">
        <Link className="text-sm font-semibold text-sky-300 transition hover:text-sky-200" href="/coin/checkout">
          ← Quay lại nạp Xu
        </Link>
        <div>
          <p className="page-kicker">Thanh toán</p>
          <h1 className="page-title !mt-2">Thanh toán</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-base">
            Quét mã trước, nếu cần thì sao chép thông tin để chuyển khoản.
          </p>
        </div>
      </header>

      {!sepay.ready ? (
        <ErrorState
          message={`Thiếu cấu hình: ${sepay.missing.join(", ")}`}
          title="SePay chưa được cấu hình đầy đủ"
        />
      ) : (
        <SePayCheckoutPanel
          bankAccountName={sepay.config.bankAccountName || "-"}
          bankAccountNumber={sepay.config.bankAccountNumber || "-"}
          bankCode={sepay.config.bankCode || "-"}
          initialSession={sessionResult.data}
        />
      )}
    </section>
  );
}
