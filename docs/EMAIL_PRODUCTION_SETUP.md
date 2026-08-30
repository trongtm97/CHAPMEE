# Email production — Postfix + OpenDKIM (Vietnix VPS)

ChapMee gửi email giao dịch (quên mật khẩu, thông báo…) qua **hàng đợi `email_jobs`** → **SMTP tới Postfix trên host** → Internet (Gmail, …). Không dùng SendGrid/Resend trong code.

**Liên quan:** `docs/EMAIL_SYSTEM.md`, `docs/DEPLOY_VIETNIX_PRODUCTION.md`, `scripts/deploy/setup-postfix-mail.sh`.

---

## Kiến trúc

```text
Browser → chapmee.com (Docker web)
              ↓ enqueue email_jobs + processPendingEmails (inline)
         nodemailer → SMTP host.docker.internal:25
              ↓ extra_hosts: host-gateway
         Postfix (VPS host) + OpenDKIM milter
              ↓ port 25 outbound
         Gmail / MX đích
```

**Vì sao không dùng `127.0.0.1` trong container?**  
`127.0.0.1` trong container là chính container, không phải VPS host. Dùng `host.docker.internal` (compose `extra_hosts`) hoặc IP gateway Docker bridge (`172.18.0.1`).

---

## Bước 1 — Cài Postfix + OpenDKIM (một lần)

Trên VPS, từ `/opt/chapmee/app` (sau `git pull`):

```bash
sudo chmod +x scripts/deploy/setup-postfix-mail.sh scripts/deploy/verify-mail.sh
sudo ./scripts/deploy/setup-postfix-mail.sh
```

Script sẽ:

- Cài Postfix + OpenDKIM
- Listen SMTP trên `127.0.0.1` **và** Docker bridge gateway
- UFW: cho phép subnet Docker → port 25 (không mở 25 ra Internet)
- Tạo/sửa OpenDKIM (`refile:`, `signing.table`, `trusted.hosts`)
- In bản ghi DNS SPF/DKIM cần thêm

---

## Bước 2 — DNS (Cloudflare)

| Record | Type | Giá trị |
|--------|------|---------|
| `default._domainkey` | TXT | Từ output script (`default.txt`) |
| `@` (chapmee.com) | TXT | `v=spf1 ip4:<VPS_IP> include:_spf.mx.cloudflare.net ~all` |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:support@chapmee.com` (tuỳ chọn) |

**Lưu ý:** SPF chỉ `include:_spf.mx.cloudflare.net` **không** cho phép VPS gửi trực tiếp — Gmail sẽ reject (`550 5.7.26 unauthenticated`).

Kiểm tra DKIM:

```bash
sudo opendkim-testkey -d chapmee.com -s default -vvv
```

---

## Bước 3 — `.env.production`

Khớp `.env.production.example`:

```env
EMAIL_MODE=smtp
SMTP_HOST=host.docker.internal
SMTP_PORT=25
SMTP_SECURE=false
SMTP_TLS_REJECT_UNAUTHORIZED=false
MAIL_FROM=ChapMee <no-reply@chapmee.com>
MAIL_REPLY_TO=ChapMee Support <support@chapmee.com>
EMAIL_MAX_RETRIES=3
```

Sau khi đổi compose (`extra_hosts`) hoặc env:

```bash
dcp up -d web
```

---

## Bước 4 — Kiểm tra

```bash
./scripts/deploy/verify-mail.sh
EMAIL_TEST_TO=your@gmail.com ./scripts/deploy/verify-mail.sh --send
```

Hoặc quên mật khẩu trên https://chapmee.com/forgot-password.

SQL:

```sql
SELECT id, type, to_email, status, error_message, sent_at
FROM email_jobs ORDER BY created_at DESC LIMIT 10;
```

Log Postfix:

```bash
sudo tail -30 /var/log/mail.log
```

---

## Cron worker (tuỳ chọn)

Luồng **quên mật khẩu** xử lý job ngay sau enqueue (`email-integrations.ts`).  
Job khác có thể treo nếu không có worker — dùng cron HTTP:

```cron
* * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" "https://chapmee.com/api/cron/process-emails?limit=30" >> /var/log/chapmee-email.log 2>&1
```

(`CRON_SECRET` lấy từ `.env.production` — không commit.)

---

## Sự cố thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|-------------|-------------|------------|
| `TIMEOUT` / `ECONNREFUSED` từ container | Postfix không listen bridge; UFW chặn 25 | Chạy lại `setup-postfix-mail.sh` |
| `self-signed certificate` | Postfix STARTTLS + nodemailer | `SMTP_TLS_REJECT_UNAUTHORIZED=false` hoặc `smtpd_tls_security_level = none` |
| `email_jobs` stuck `sending` | Worker crash giữa chừng | `UPDATE email_jobs SET status='pending' WHERE status='sending';` |
| Gmail `550 5.7.26 unauthenticated` | SPF/DKIM fail | Sửa DNS; kiểm tra `signing.table` (không được chứa lệnh shell); `refile:` trong `opendkim.conf` |
| OpenDKIM `no signing table match` | `signing.table` hỏng hoặc thiếu `refile:` | Chạy lại setup script |

---

## Local dev

Giữ `EMAIL_MODE=console` trong `.env.local` — xem `docs/EMAIL_SYSTEM.md`.
