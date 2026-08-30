"use client";

const SECTIONS = [
  { id: "ecosystem", label: "Trạng thái" },
  { id: "coin", label: "Xu & tỷ giá" },
  { id: "coin-topup-packages", label: "Gói nạp" },
  { id: "sepay-payment", label: "SePay" },
  { id: "default-share", label: "Chia sẻ" },
  { id: "revenue-sources", label: "Theo nguồn" },
  { id: "withdrawal", label: "Rút tiền" },
  { id: "risk-lock", label: "Rủi ro" },
  { id: "preview", label: "Xem thử" },
  { id: "history", label: "Lịch sử" }
] as const;

export function MonetizationSectionNav({ showHistory }: { showHistory: boolean }) {
  const items = showHistory ? SECTIONS : SECTIONS.filter((s) => s.id !== "history");

  return (
    <nav
      aria-label="Mục cấu hình"
      className="flex gap-1.5 overflow-x-auto pb-1 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:w-44 xl:flex-col xl:overflow-y-auto xl:overflow-x-hidden xl:pb-0 xl:pr-2"
    >
      {items.map((section) => (
        <a
          className="shrink-0 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-cyan-400/30 hover:text-cyan-200 xl:shrink xl:px-3 xl:py-2"
          href={`#${section.id}`}
          key={section.id}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
