/**
 * Gửi mã xác nhận tài chính qua email.
 * TODO: chuyển sang enqueueEmail (lib/email) khi bật flow SMTP production.
 */
export async function sendFinanceVerificationEmail(input: {
  to: string;
  purposeLabel: string;
  code: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!input.to.includes("@")) {
    return { ok: false, error: "Email không hợp lệ." };
  }

  if (process.env.NODE_ENV === "development") {
    console.info(
      `[finance-email] ${input.purposeLabel} → ${input.to}: mã ${input.code} (dev only, không gửi thật)`
    );
  }

  // Production: wire real email provider here.
  return { ok: true };
}
