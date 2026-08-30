import "server-only";

import { enqueueEmail } from "@/lib/email/email-service";

/** Đặt lại mật khẩu — gọi từ Better Auth sendResetPassword. */
export async function enqueuePasswordResetEmail(input: {
  to: string;
  resetUrl: string;
  displayName?: string | null;
}): Promise<void> {
  try {
    await enqueueEmail({
      type: "auth.reset_password",
      toEmail: input.to,
      variables: {
        displayName: input.displayName?.trim() || "bạn",
        resetUrl: input.resetUrl
      }
    });
  } catch (error) {
    console.error(
      "[email] enqueue auth.reset_password failed:",
      error instanceof Error ? error.message : error
    );
    return;
  }

  void import("@/lib/email/email-service")
    .then((m) => m.processPendingEmails(10))
    .catch((err) => {
      console.error("[email] process pending after reset:", err);
    });
}

/** Xác minh email — dùng khi bật requireEmailVerification sau này. */
export async function enqueueVerifyEmail(input: {
  to: string;
  verifyUrl: string;
  displayName?: string | null;
}): Promise<void> {
  try {
    await enqueueEmail({
      type: "auth.verify_email",
      toEmail: input.to,
      variables: {
        displayName: input.displayName?.trim() || "bạn",
        verifyUrl: input.verifyUrl
      }
    });
  } catch (error) {
    console.error(
      "[email] enqueue auth.verify_email failed:",
      error instanceof Error ? error.message : error
    );
  }
}

/** Cảnh báo đăng nhập — tích hợp sau khi có IP/geo. */
export async function enqueueLoginAlertEmail(input: {
  to: string;
  displayName?: string | null;
  ip: string;
  time: string;
  location: string;
}): Promise<void> {
  try {
    await enqueueEmail({
      type: "auth.login_alert",
      toEmail: input.to,
      variables: {
        displayName: input.displayName?.trim() || "bạn",
        ip: input.ip,
        time: input.time,
        location: input.location
      }
    });
  } catch (error) {
    console.error(
      "[email] enqueue auth.login_alert failed:",
      error instanceof Error ? error.message : error
    );
  }
}
