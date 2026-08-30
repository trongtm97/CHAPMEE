import Link from "next/link";
import { FACEBOOK_ICON_CATALOG_COUNT } from "@/lib/utilities/facebook-icon-catalog";

export function IconUtilitySeoContent() {
  return (
    <section
      aria-labelledby="icon-utility-seo"
      className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"
    >
      <h2 className="text-base font-bold text-zinc-100" id="icon-utility-seo">
        Công cụ Icon Facebook trên ChapMee
      </h2>
      <p>
        ChapMee cung cấp bộ công cụ <strong className="font-semibold text-zinc-200">Icon Facebook</strong>{" "}
        miễn phí với hơn {FACEBOOK_ICON_CATALOG_COUNT.toLocaleString("vi-VN")} biểu tượng cảm xúc, emoji,
        cờ quốc gia và ký hiệu phổ biến khi đăng bài, bình luận hoặc nhắn tin trên Facebook, Zalo,
        Messenger và các mạng xã hội khác. Chỉ cần chạm vào icon — hệ thống tự sao chép vào clipboard
        để bạn dán ngay vào status, comment hoặc tin nhắn.
      </p>
      <p>
        Bộ icon được sắp xếp theo danh mục quen thuộc: biểu cảm (Smileys), cử chỉ &amp; con người, trái
        tim &amp; hoạt động, đồ ăn, động vật, thiên nhiên, du lịch, đồ vật, biểu tượng và cờ quốc gia.
        Công cụ tối ưu cho điện thoại và máy tính, phù hợp khi bạn cần tìm nhanh emoji Facebook mà
        không cần cài ứng dụng riêng.
      </p>
      <h3 className="text-sm font-bold text-zinc-200">Cách dùng nhanh</h3>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Chọn danh mục ở thanh bên công cụ hoặc cuộn xuống nhóm icon cần dùng.</li>
        <li>Chạm vào icon — nội dung được sao chép tự động.</li>
        <li>Dán (Ctrl+V / giữ để dán) vào ô soạn thảo Facebook hoặc ứng dụng chat.</li>
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
        . ChapMee sẽ tiếp tục bổ sung thêm công cụ hỗ trợ nội dung trong thời gian tới.
      </p>
    </section>
  );
}
