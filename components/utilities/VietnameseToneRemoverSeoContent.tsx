import Link from "next/link";

export function VietnameseToneRemoverSeoContent() {
  return (
    <section
      aria-labelledby="tone-remover-seo"
      className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"
    >
      <h2 className="text-base font-bold text-zinc-100" id="tone-remover-seo">
        Công cụ xóa dấu tiếng Việt trên ChapMee
      </h2>
      <p>
        ChapMee cung cấp công cụ <strong className="font-semibold text-zinc-200">Xóa Dấu Tiếng Việt</strong>{" "}
        miễn phí, chạy hoàn toàn trên trình duyệt — không gửi văn bản lên server. Bạn có thể chuyển nhanh
        tiếng Việt có dấu sang không dấu, tạo slug SEO cho URL, đổi chữ hoa/thường, xóa ký tự đặc biệt và
        sao chép kết quả chỉ với một click.
      </p>
      <p>
        Công cụ phù hợp khi đặt tên file, tạo đường dẫn bài viết, chuẩn hóa tên người dùng, xử lý dữ liệu
        nhập từ Excel hoặc chuẩn bị nội dung cho hệ thống chỉ hỗ trợ ASCII. Mọi thao tác diễn ra tức thì
        khi bạn nhập hoặc dán văn bản.
      </p>
      <h3 className="text-sm font-bold text-zinc-200">Cách dùng nhanh</h3>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Dán hoặc nhập văn bản tiếng Việt có dấu vào ô nhập.</li>
        <li>Chọn kiểu chữ, bật slug SEO hoặc các tùy chọn xử lý nếu cần.</li>
        <li>Sao chép kết quả hoặc tải file TXT để dùng tiếp.</li>
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
