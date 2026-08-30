import Link from "next/link";

export function TextCounterSeoContent() {
  return (
    <section
      aria-labelledby="text-counter-seo"
      className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"
    >
      <h2 className="text-base font-bold text-zinc-100" id="text-counter-seo">
        Công cụ đếm từ và ký tự trên ChapMee
      </h2>
      <p>
        ChapMee cung cấp công cụ <strong className="font-semibold text-zinc-200">Đếm Từ / Ký Tự</strong>{" "}
        miễn phí, chạy hoàn toàn trên trình duyệt — không gửi văn bản lên server. Bạn có thể thống kê số
        ký tự, số từ, số câu, số dòng, số đoạn văn và ước tính thời gian đọc hoặc nói ngay khi nhập hoặc
        dán nội dung.
      </p>
      <p>
        Công cụ phù hợp cho người viết content, làm SEO, soạn bài Facebook, TikTok, YouTube, viết mô tả
        sản phẩm, quảng cáo hoặc bài luận học tập. Mọi thống kê cập nhật tức thì khi bạn gõ hoặc dán văn
        bản.
      </p>
      <h3 className="text-sm font-bold text-zinc-200">Cách dùng nhanh</h3>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Dán hoặc nhập văn bản vào ô nhập lớn.</li>
        <li>Xem thống kê tự động cập nhật bên dưới.</li>
        <li>Dùng nút sao chép, xóa hoặc dán văn bản mẫu khi cần.</li>
      </ol>
      <p>
        Tiện ích nằm trong mục{" "}
        <Link className="font-semibold text-cyan-200 hover:text-cyan-100" href="/tien-ich">
          Tiện ích ChapMee
        </Link>
        . Bạn cũng có thể vào từ{" "}
        <Link className="font-semibold text-cyan-200 hover:text-cyan-100" href="/discover">
          Khám phá
        </Link>
        .
      </p>
    </section>
  );
}
