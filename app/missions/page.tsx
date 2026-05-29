import { MobileBackHeader } from "@/components/me/MobileBackHeader";

export default function MissionsPage() {
  return (
    <section className="space-y-4">
      <MobileBackHeader fallbackHref="/me" title="Nhiệm vụ" />
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm font-semibold text-zinc-200">Sắp ra mắt</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Chuỗi đọc hàng ngày, nhiệm vụ và phần thưởng đang được xây dựng. Quay lại sau
          nhé.
        </p>
      </div>
    </section>
  );
}
