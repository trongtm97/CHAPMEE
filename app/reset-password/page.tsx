import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { STUDIO_NOINDEX_ROBOTS } from "@/lib/seo/should-index";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu | ChapMee",
  robots: STUDIO_NOINDEX_ROBOTS
};

export default function ResetPasswordPage() {
  return (
    <AuthPageShell
      accentDetail="Mật khẩu mới nên đủ dài và dễ nhớ với bạn, nhưng khó đoán với người khác."
      accentLabel="Bước cuối"
      accentValue="Thiết lập mật khẩu mới"
      description="Chọn mật khẩu mới để hoàn tất quá trình khôi phục tài khoản ChapMee."
      eyebrow="Mật khẩu mới"
      highlights={[
        {
          title: "Ít nhất 8 ký tự",
          body: "Bạn có thể dùng cụm từ dài hơn để dễ nhớ và tăng độ an toàn."
        },
        {
          title: "Không cần tạo tài khoản mới",
          body: "Bạn chỉ đang cập nhật thông tin truy cập cho chính tài khoản hiện tại."
        },
        {
          title: "Vào lại ngay sau khi đổi",
          body: "Hoàn tất bước này và ChapMee sẽ đưa bạn về trang đăng nhập để tiếp tục."
        }
      ]}
      primaryCtaHref="/login"
      primaryCtaLabel="Đăng nhập"
      secondaryCtaHref="/forgot-password"
      secondaryCtaLabel="Yêu cầu link mới"
      title="Đặt mật khẩu mới để tiếp tục đăng nhập an toàn."
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthPageShell>
  );
}
