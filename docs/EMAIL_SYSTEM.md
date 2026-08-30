# Hệ thống email giao dịch ChapMee



Email giao dịch (xác minh, đặt lại mật khẩu, thông báo hệ thống, coin…) dùng **hàng đợi PostgreSQL** (`email_jobs`) và worker/cron. Không dùng dịch vụ email trả phí bên thứ ba trong code.



**Production VPS:** `docs/EMAIL_PRODUCTION_SETUP.md` (Postfix, OpenDKIM, DNS, UFW).



## Biến môi trường



| Biến | Mô tả |

|------|--------|

| `EMAIL_MODE` | `console` (local/dev) hoặc `smtp` (production VPS) |

| `SMTP_HOST` | Local dev: `127.0.0.1`. Production Docker: `host.docker.internal` |

| `SMTP_PORT` | Mặc định `25` |

| `SMTP_SECURE` | `false` cho Postfix relay nội bộ |

| `SMTP_TLS_REJECT_UNAUTHORIZED` | `false` trên VPS (Postfix loopback); `true` mặc định local |

| `SMTP_USER` / `SMTP_PASS` | Để trống nếu Postfix không yêu cầu auth |

| `MAIL_FROM` | Ví dụ `ChapMee <no-reply@chapmee.com>` |

| `MAIL_REPLY_TO` | Email hỗ trợ (tuỳ chọn) |

| `EMAIL_MAX_RETRIES` | Số lần thử lại tối đa (mặc định 3) |

| `EMAIL_TEST_TO` | Email nhận khi chạy `npm run email:test` |



Xem `.env.example` (local) và `.env.production.example` (VPS).



## Local development



1. Migration: `npm run db:migrate`



2. Trong `.env.local`:



   ```env

   EMAIL_MODE=console

   MAIL_FROM=ChapMee <no-reply@chapmee.com>

   MAIL_REPLY_TO=ChapMee Support <support@chapmee.com>

   EMAIL_TEST_TO=your@email.com

   ```



3. Gửi email thử: `npm run email:test`  

   Kỳ vọng: in console, `email_jobs.status = sent`, không gửi SMTP thật.



4. Sau quên mật khẩu (dev): `npm run email:worker` nếu cần.



## Production (VPS + Postfix)



1. Host: `sudo ./scripts/deploy/setup-postfix-mail.sh`



2. `.env.production`:



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



3. `dcp up -d web` (cần `extra_hosts` trong `docker-compose.production.yml`)



4. Kiểm tra: `./scripts/deploy/verify-mail.sh`



5. Cron tuỳ chọn:



   ```cron

   * * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" "https://chapmee.com/api/cron/process-emails?limit=30" >> /var/log/chapmee-email.log 2>&1

   ```



## Template (trong code)



| Key | Mục đích |

|-----|----------|

| `auth.verify_email` | Xác minh email |

| `auth.reset_password` | Quên mật khẩu |

| `auth.login_alert` | Cảnh báo đăng nhập |

| `system.notice` | Thông báo chung |

| `payment.coin_topup_success` | Nạp coin |

| `payment.withdrawal_notice` | Rút tiền |

| `moderation.warning` | Cảnh báo moderation |



API: `enqueueEmail`, `sendEmailNow`, `processPendingEmails`, `renderEmailTemplate` trong `lib/email/`.



## Tích hợp auth



- **Quên mật khẩu:** Better Auth `sendResetPassword` → `enqueuePasswordResetEmail` → job `auth.reset_password` → `processPendingEmails` ngay sau enqueue.

- **Xác minh / login alert:** `lib/email/email-integrations.ts`.



## SMTP test trên máy local



```bash

EMAIL_MODE=smtp SMTP_HOST=127.0.0.1 SMTP_PORT=25 npm run email:test

```



`ECONNREFUSED` trên máy dev là bình thường nếu chưa có Postfix local.



## Xem lỗi



```sql

SELECT id, type, to_email, status, retry_count, error_message, created_at, sent_at

FROM email_jobs

ORDER BY created_at DESC

LIMIT 20;

```



Log: `/var/log/mail.log` (Postfix), `/var/log/chapmee-email.log` (cron), `dcp logs web` (app).


