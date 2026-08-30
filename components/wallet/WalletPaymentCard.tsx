import Link from "next/link";
import { SectionHeader } from "@/components/ui";

type WalletPaymentCardProps = {
  bankCode: string | null | undefined;
  bankAccountNumberMasked: string;
  bankAccountName: string | null | undefined;
  canUseSePay: boolean;
};

function PaymentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="min-w-0 text-sm text-zinc-400">{label}</p>
      <p className="shrink-0 whitespace-nowrap text-right text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

export function WalletPaymentCard({
  bankAccountName,
  bankAccountNumberMasked,
  bankCode,
  canUseSePay
}: WalletPaymentCardProps) {
  return (
    <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5">
      <SectionHeader subtitle="Hỗ trợ SePay / VietQR" title="Thanh toán" />

      <div className="space-y-2.5 text-sm text-zinc-300">
        <PaymentRow label="Phương thức" value="SePay / VietQR" />
        <PaymentRow label="Ngân hàng" value={bankCode || "-"} />
        <PaymentRow label="Tài khoản" value={bankAccountNumberMasked} />
        {bankAccountName ? <PaymentRow label="Chủ tài khoản" value={bankAccountName} /> : null}
      </div>

      {!canUseSePay ? (
        <p className="text-sm text-amber-300 break-words">
          Checkout tạm chưa sẵn sàng. Kiểm tra lại cấu hình SePay và payment provider.
        </p>
      ) : null}

      <Link
        className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
          canUseSePay
            ? "w-full bg-cyan-300 text-zinc-950 shadow-[0_12px_24px_rgba(103,232,249,0.14)] hover:bg-cyan-200"
            : "pointer-events-none w-full cursor-not-allowed bg-white/10 text-zinc-500"
        }`}
        href="/coin/checkout"
      >
        Mở checkout
      </Link>
    </div>
  );
}
