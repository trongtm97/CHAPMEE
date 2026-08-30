import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { STUDIO_NOINDEX_ROBOTS } from "@/lib/seo/should-index";

export const metadata: Metadata = {
  title: "Quên mật khẩu | ChapMee",
  robots: STUDIO_NOINDEX_ROBOTS
};

export default async function ForgotPasswordPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/me");
  }

  return (
    <AuthPageShell
      accentDetail="Chúng tôi sẽ gửi email chứa đường dẫn an toàn để bạn đặt lại mật khẩu và quay lại tài khoản ChapMee."
      accentLabel="Khôi phục truy cập"
      accentValue="Lấy lại tài khoản thật nhanh"
      description="Nhập email bạn đã dùng để đăng ký. Nếu hộp thư chính chưa thấy, hãy kiểm tra cả mục spam hoặc quảng cáo."
      eyebrow="Quên mật khẩu"
      highlights={[
        {
          title: "Email xác thực rõ ràng",
          body: "ChapMee chỉ gửi liên kết đặt lại mật khẩu về đúng email bạn đã đăng ký."
        },
        {
          title: "Không làm mất dữ liệu đọc",
          body: "Sau khi đặt lại, thư viện, bookmark và lịch sử đọc của bạn vẫn được giữ nguyên."
        },
        {
          title: "Quay lại nhanh",
          body: "Chỉ cần đặt mật khẩu mới rồi đăng nhập lại để tiếp tục hành trình đang dở."
        }
      ]}
      primaryCtaHref="/login"
      primaryCtaLabel="Quay lại đăng nhập"
      secondaryCtaHref="/register"
      secondaryCtaLabel="Tạo tài khoản mới"
      title="Khôi phục mật khẩu để trở lại với góc đọc của bạn."
    >
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthPageShell>
  );
}
