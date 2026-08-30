import Link from "next/link";
import type { ReactNode } from "react";

type AuthEntryVariant = "login" | "register";

const COPY = {
  login: {
    eyebrow: "Đăng nhập",
    title: "Tiếp tục hành trình đọc của bạn",
    description:
      "Đồng bộ tủ truyện, lịch sử đọc, bình luận và Xu trong một tài khoản.",
    benefits: [
      {
        title: "Đồng bộ mọi thiết bị",
        body: "Tiến độ đọc và thư viện luôn đi cùng một tài khoản."
      },
      {
        title: "Theo dõi & tương tác",
        body: "Bookmark, bình luận, theo dõi tác giả và quản lý Xu."
      }
    ],
    primaryCta: { href: "/register", label: "Tạo tài khoản" },
    secondaryCta: { href: "/discover", label: "Khám phá truyện" }
  },
  register: {
    eyebrow: "Đăng ký",
    title: "Tạo góc đọc truyện của riêng bạn",
    description:
      "Một tài khoản để lưu truyện, bình luận, theo dõi tác giả và quản lý Xu.",
    benefits: [
      {
        title: "Thư viện cá nhân",
        body: "Lưu truyện yêu thích và quay lại đúng chương đang đọc."
      },
      {
        title: "Cộng đồng & thanh toán",
        body: "Bình luận, theo dõi tác giả và nạp Xu khi cần."
      }
    ],
    primaryCta: { href: "/login", label: "Đã có tài khoản" },
    secondaryCta: { href: "/discover", label: "Khám phá truyện" }
  }
} as const;

type AuthEntryPageShellProps = {
  variant: AuthEntryVariant;
  children: ReactNode;
};

export function AuthEntryPageShell({
  variant,
  children
}: AuthEntryPageShellProps) {
  const copy = COPY[variant];

  return (
    <section className="relative">
      <div className="mx-auto grid max-w-5xl items-start gap-5 px-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22.5rem)] lg:gap-8 lg:px-6">
        <div className="order-1 lg:order-2">
          <div className="rounded-2xl border border-white/10 bg-[#0f141c]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm sm:p-5">
            {children}
          </div>
        </div>

        <div className="order-2 space-y-4 lg:order-1 lg:py-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/75">
            {copy.eyebrow}
          </p>
          <div className="space-y-2.5">
            <h1 className="max-w-md text-[1.75rem] font-bold leading-[1.2] tracking-[-0.02em] text-white sm:text-[2rem] lg:text-[2.375rem] lg:leading-[1.18]">
              {copy.title}
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-slate-400">
              {copy.description}
            </p>
          </div>

          <ul className="space-y-2.5 pt-0.5">
            {copy.benefits.map((item) => (
              <li
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5"
                key={item.title}
              >
                <p className="text-sm font-semibold text-zinc-100">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <Link
              className={
                variant === "login"
                  ? "inline-flex h-10 items-center justify-center rounded-lg bg-sky-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                  : "inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.06]"
              }
              href={copy.primaryCta.href}
            >
              {copy.primaryCta.label}
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.06]"
              href={copy.secondaryCta.href}
            >
              {copy.secondaryCta.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
