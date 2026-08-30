import { escapeHtml } from "@/lib/email/email-escape";
import type { EmailTemplateVariables, EmailType } from "@/lib/email/email-types";

function layout(title: string, bodyHtml: string, bodyText: string) {
  const html = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px;">
  <p style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:0.08em;">ChapMee</p>
  <h1 style="font-size:20px;margin:16px 0 12px;">${escapeHtml(title)}</h1>
  ${bodyHtml}
  <p style="margin-top:32px;font-size:12px;color:#888;">Email hệ thống — vui lòng không trả lời trực tiếp email này nếu không có hướng dẫn.</p>
</body>
</html>`;
  return { html, text: bodyText };
}

export function renderEmailTemplate<T extends EmailType>(
  templateKey: T,
  variables: EmailTemplateVariables[T]
): { subject: string; html: string; text: string } {
  switch (templateKey) {
    case "auth.verify_email": {
      const v = variables as EmailTemplateVariables["auth.verify_email"];
      const subject = "Xác minh email ChapMee";
      const bodyHtml = `<p>Xin chào ${escapeHtml(v.displayName)},</p>
<p>Nhấn link sau để xác minh email:</p>
<p><a href="${escapeHtml(v.verifyUrl)}">Xác minh email</a></p>`;
      const bodyText = `Xin chào ${v.displayName},\n\nXác minh email: ${v.verifyUrl}`;
      const { html, text } = layout("Xác minh email", bodyHtml, bodyText);
      return { subject, html, text };
    }
    case "auth.reset_password": {
      const v = variables as EmailTemplateVariables["auth.reset_password"];
      const subject = "Đặt lại mật khẩu ChapMee";
      const bodyHtml = `<p>Xin chào ${escapeHtml(v.displayName)},</p>
<p>Bạn đã yêu cầu đặt lại mật khẩu. Link có thời hạn:</p>
<p><a href="${escapeHtml(v.resetUrl)}">Đặt mật khẩu mới</a></p>
<p>Nếu không phải bạn, hãy bỏ qua email này.</p>`;
      const bodyText = `Xin chào ${v.displayName},\n\nĐặt lại mật khẩu: ${v.resetUrl}\n\nNếu không phải bạn, hãy bỏ qua email này.`;
      const { html, text } = layout("Đặt lại mật khẩu", bodyHtml, bodyText);
      return { subject, html, text };
    }
    case "auth.login_alert": {
      const v = variables as EmailTemplateVariables["auth.login_alert"];
      const subject = "Cảnh báo đăng nhập ChapMee";
      const bodyHtml = `<p>Xin chào ${escapeHtml(v.displayName)},</p>
<p>Phát hiện đăng nhập mới:</p>
<ul>
<li>Thời gian: ${escapeHtml(v.time)}</li>
<li>IP: ${escapeHtml(v.ip)}</li>
<li>Vị trí: ${escapeHtml(v.location)}</li>
</ul>`;
      const bodyText = `Đăng nhập mới — ${v.time}, IP ${v.ip}, ${v.location}`;
      const { html, text } = layout("Cảnh báo đăng nhập", bodyHtml, bodyText);
      return { subject, html, text };
    }
    case "system.notice": {
      const v = variables as EmailTemplateVariables["system.notice"];
      const subject = "Thông báo từ ChapMee";
      const action =
        v.actionUrl && v.actionLabel
          ? `<p><a href="${escapeHtml(v.actionUrl)}">${escapeHtml(v.actionLabel)}</a></p>`
          : "";
      const bodyHtml = `<p><strong>${escapeHtml(v.title)}</strong></p>
<p>${escapeHtml(v.message)}</p>${action}`;
      const bodyText = `${v.title}\n\n${v.message}${
        v.actionUrl ? `\n\n${v.actionLabel ?? "Link"}: ${v.actionUrl}` : ""
      }`;
      const { html, text } = layout(v.title, bodyHtml, bodyText);
      return { subject, html, text };
    }
    case "payment.coin_topup_success": {
      const v = variables as EmailTemplateVariables["payment.coin_topup_success"];
      const subject = "Nạp coin ChapMee thành công";
      const bodyHtml = `<p>Xin chào ${escapeHtml(v.displayName)},</p>
<p>Giao dịch nạp coin đã thành công.</p>
<ul>
<li>Số tiền: ${escapeHtml(v.amountVnd)} VND</li>
<li>Coin: ${escapeHtml(v.coinAmount)}</li>
<li>Mã giao dịch: ${escapeHtml(v.transactionCode)}</li>
</ul>`;
      const bodyText = `Nạp coin thành công — ${v.amountVnd} VND, ${v.coinAmount} coin, mã ${v.transactionCode}`;
      const { html, text } = layout("Nạp coin thành công", bodyHtml, bodyText);
      return { subject, html, text };
    }
    case "payment.withdrawal_notice": {
      const v = variables as EmailTemplateVariables["payment.withdrawal_notice"];
      const subject = "Thông báo rút tiền ChapMee";
      const bodyHtml = `<p>Xin chào ${escapeHtml(v.displayName)},</p>
<p>Trạng thái: ${escapeHtml(v.status)}</p>
<p>Số tiền: ${escapeHtml(v.amountVnd)} VND</p>
<p>Mã: ${escapeHtml(v.transactionCode)}</p>`;
      const bodyText = `Rút tiền — ${v.status}, ${v.amountVnd} VND, mã ${v.transactionCode}`;
      const { html, text } = layout("Thông báo rút tiền", bodyHtml, bodyText);
      return { subject, html, text };
    }
    case "moderation.warning": {
      const v = variables as EmailTemplateVariables["moderation.warning"];
      const subject = "Cảnh báo từ ChapMee";
      const action = v.actionUrl
        ? `<p><a href="${escapeHtml(v.actionUrl)}">Xem chi tiết</a></p>`
        : "";
      const bodyHtml = `<p>Xin chào ${escapeHtml(v.displayName)},</p>
<p>${escapeHtml(v.reason)}</p>${action}`;
      const bodyText = `${v.displayName}\n\n${v.reason}`;
      const { html, text } = layout("Cảnh báo", bodyHtml, bodyText);
      return { subject, html, text };
    }
    default: {
      const _exhaustive: never = templateKey;
      throw new Error(`Unknown email template: ${String(_exhaustive)}`);
    }
  }
}
