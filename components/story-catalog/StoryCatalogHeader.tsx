type StoryCatalogHeaderProps = {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
};

export function StoryCatalogHeader({
  eyebrow = "KHÁM PHÁ",
  subtitle = "Tìm truyện sáng tác, truyện dịch, truyện hoàn thành và các tác phẩm phù hợp với gu đọc của bạn.",
  title = "Danh mục truyện"
}: StoryCatalogHeaderProps) {
  return (
    <header className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300/80">{eyebrow}</p>
      <h1 className="text-2xl font-black tracking-tight text-zinc-50 md:text-[2rem] md:leading-tight">
        {title}
      </h1>
      {subtitle ? <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">{subtitle}</p> : null}
    </header>
  );
}
