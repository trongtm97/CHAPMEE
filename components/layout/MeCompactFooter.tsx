import Link from "next/link";
import { SITE_NAME } from "@/lib/seo/metadata";

/** Gọn cho /me trên mobile — tránh footer dài đẩy bottom nav. */
export function MeCompactFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/8 py-4 lg:hidden">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[0.65rem] text-zinc-500">
        <span className="font-semibold text-zinc-400">{SITE_NAME}</span>
        <Link className="hover:text-zinc-300" href="/chinh-sach">
          Điều khoản
        </Link>
        <Link className="hover:text-zinc-300" href="/chinh-sach/chinh-sach-quyen-rieng-tu">
          Quyền riêng tư
        </Link>
        <span>© {year}</span>
      </div>
    </footer>
  );
}
