import Link from "next/link";



export function QrCodeGeneratorSeoContent() {

  return (

    <section

      aria-labelledby="qr-generator-seo"

      className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"

    >

      <h2 className="text-base font-bold text-zinc-100" id="qr-generator-seo">

        Công cụ tạo mã QR Code trên ChapMee

      </h2>

      <p>

        ChapMee cung cấp công cụ <strong className="font-semibold text-zinc-200">Tạo Mã QR Code</strong>{" "}

        miễn phí, chạy hoàn toàn trên trình duyệt — không gửi dữ liệu lên server. Bạn có thể tạo mã QR

        cho liên kết website, văn bản, số điện thoại, email, SMS, WiFi, danh thiếp vCard và nội dung

        tùy chỉnh, rồi tải xuống PNG hoặc SVG.

      </p>

      <p>

        Công cụ phù hợp khi in mã QR lên tài liệu, poster, danh thiếp, menu nhà hàng, chia sẻ WiFi

        cho khách hoặc tạo liên kết nhanh cho chiến dịch marketing. Mọi xử lý diễn ra tức thì trên

        thiết bị của bạn.

      </p>

      <h3 className="text-sm font-bold text-zinc-200">Cách dùng nhanh</h3>

      <ol className="list-decimal space-y-1.5 pl-5">

        <li>Chọn loại mã QR và nhập thông tin cần mã hóa.</li>

        <li>Tùy chỉnh kích thước, màu sắc hoặc mức sửa lỗi nếu cần.</li>

        <li>Bấm &quot;Tạo mã QR&quot;, quét thử bằng điện thoại rồi tải PNG hoặc SVG.</li>

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

