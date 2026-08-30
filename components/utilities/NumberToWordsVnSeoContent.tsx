import Link from "next/link";

export function NumberToWordsVnSeoContent() {
  return (
    <section
      aria-labelledby="money-to-words-seo"
      className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"
    >
      <h2 className="text-base font-bold text-zinc-100" id="money-to-words-seo">
        Công cụ chuyển số tiền thành chữ trên ChapMee
      </h2>
      <p>
        ChapMee cung cấp công cụ <strong className="font-semibold text-zinc-200">Chuyển Số Tiền Thành Chữ</strong>{" "}
        miễn phí, chạy hoàn toàn trên trình duyệt — không gửi số tiền lên server. Bạn nhập số bằng chữ số và nhận
        ngay ba định dạng kết quả: viết hoa chữ cái đầu, viết thường và IN HOA toàn bộ, phù hợp cho hợp đồng, hóa
        đơn, phiếu thu, phiếu chi và văn bản hành chính.
      </p>
      <p>
        Công cụ hỗ trợ nhập số có dấu chấm, phẩy phân cách hàng nghìn, khoảng trắng hoặc kèm đơn vị VND/đồng. Có
        thể bật thêm chữ &ldquo;chẵn&rdquo;, tắt đơn vị &ldquo;đồng&rdquo; hoặc xuất kết quả không dấu khi cần.
      </p>
      <h3 className="text-sm font-bold text-zinc-200">Cách dùng nhanh</h3>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Nhập số tiền vào ô nhập (ví dụ: 1.250.000 hoặc 1250000).</li>
        <li>Bấm &ldquo;Chuyển thành chữ&rdquo; để xem cả ba định dạng kết quả.</li>
        <li>Bấm &ldquo;Sao chép&rdquo; ở định dạng cần dùng, hoặc &ldquo;Xóa để nhập mới&rdquo; để nhập số khác.</li>
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
