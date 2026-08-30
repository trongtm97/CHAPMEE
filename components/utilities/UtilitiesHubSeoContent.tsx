import Link from "next/link";
import { UTILITY_ITEMS } from "@/lib/utilities/utilities-hub";

export function UtilitiesHubSeoContent() {
  return (
    <section
      aria-labelledby="utilities-hub-seo"
      className="mt-8 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"
    >
      <h2 className="text-base font-bold text-zinc-100" id="utilities-hub-seo">
        Tiện ích ChapMee — công cụ hỗ trợ đọc &amp; sáng tạo nội dung
      </h2>
      <p>
        Mục <strong className="font-semibold text-zinc-200">Tiện ích</strong> tập hợp các công cụ nhỏ,
        miễn phí trên ChapMee: sao chép icon Facebook, và các tiện ích khác dành cho độc giả, tác giả
        khi tương tác trên mạng xã hội hoặc soạn nội dung nhanh. Mỗi công cụ được tối ưu cho mobile và
        tích hợp sẵn trong hệ sinh thái đọc truyện ChapMee.
      </p>
      <ul className="list-disc space-y-1 pl-5">
        {UTILITY_ITEMS.map((item) => (
          <li key={item.href}>
            <Link className="font-semibold text-cyan-200 hover:text-cyan-100" href={item.href}>
              {item.title}
            </Link>
            {" — "}
            {item.description}
          </li>
        ))}
      </ul>
    </section>
  );
}
