const QUICK_TIPS = [
  "Bật trả phí cho truyện có nhiều lượt đọc.",
  "Miễn phí vài chương đầu để tăng chuyển đổi.",
  "Dùng Reels kéo độc giả vào truyện.",
  "Trả lời bình luận để giữ tương tác.",
  "Bổ sung ảnh bìa và mô tả rõ ràng."
];

export function MonetizationQuickGuide() {
  return (
    <details className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/50">
        Mẹo tăng doanh thu
      </summary>
      <ul className="mt-3 space-y-1.5 text-sm text-zinc-400">
        {QUICK_TIPS.map((tip) => (
          <li key={tip}>· {tip}</li>
        ))}
      </ul>
    </details>
  );
}
