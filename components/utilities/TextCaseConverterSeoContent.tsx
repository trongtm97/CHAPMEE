import Link from "next/link";

export function TextCaseConverterSeoContent() {
  return (
    <section
      aria-labelledby="text-case-converter-seo"
      className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"
    >
      <h2 className="text-base font-bold text-zinc-100" id="text-case-converter-seo">
        Công cụ chuyển chữ hoa / thường trên ChapMee
      </h2>
      <p>
        ChapMee cung cấp công cụ <strong className="font-semibold text-zinc-200">Chuyển Chữ Hoa / Thường</strong>{" "}
        miễn phí, chạy hoàn toàn trên trình duyệt — không gửi văn bản lên server. Bạn có thể chuyển đổi
        nhanh sang chữ thường, CHỮ HOA, viết hoa chữ cái đầu tiên, viết hoa mỗi từ, viết hoa đầu câu hoặc
        đảo ngược chữ hoa/thường chỉ với một lần bấm.
      </p>
      <p>
        Công cụ phù hợp cho người viết content, bán hàng online, làm SEO, soạn tiêu đề sản phẩm hoặc bài
        viết, xử lý dữ liệu văn bản và dân văn phòng. Hỗ trợ tiếng Việt có dấu, tiếng Anh, số, emoji và
        nhiều dòng văn bản.
      </p>
      <h3 className="text-sm font-bold text-zinc-200">Cách dùng nhanh</h3>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Nhập hoặc dán văn bản vào ô nhập lớn.</li>
        <li>Bấm &ldquo;Chuyển đổi&rdquo; để xem tất cả định dạng kết quả cùng lúc.</li>
        <li>Bấm &ldquo;Sao chép&rdquo; ở định dạng cần dùng.</li>
        <li>Bấm &ldquo;Xóa để nhập mới&rdquo; nếu muốn nhập văn bản khác.</li>
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
