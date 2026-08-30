export const EMAIL_DELIVERY_NOTICE_TITLE = "Lưu ý về email từ ChapMee";

export const EMAIL_DELIVERY_NOTICE_BODY =
  "Email hệ thống có thể vào hộp thư rác hoặc Quảng cáo. Nếu không thấy thư trong Hộp thư đến sau vài phút, hãy kiểm tra thư mục Spam/Thư rác và đánh dấu «Không phải thư rác» để nhận thư sau này.";

export const EMAIL_SENT_SUCCESS_SUFFIX =
  " Nếu chưa thấy trong vài phút, hãy kiểm tra hộp thư rác/spam.";

export function withEmailSentSuccessHint(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("thư rác") || normalized.includes("spam")) {
    return message;
  }
  return `${message}${EMAIL_SENT_SUCCESS_SUFFIX}`;
}
