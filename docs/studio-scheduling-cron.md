# Studio — Cron lịch đăng

## Endpoint

`GET /api/cron/publish-scheduled`

Xác thực:

- Header: `Authorization: Bearer <CRON_SECRET>`
- Hoặc query: `?secret=<CRON_SECRET>`

## Biến môi trường

- `CRON_SECRET` — bắt buộc
- `SUPABASE_SERVICE_ROLE_KEY` — bắt buộc cho job publish

## Vercel Cron (TODO)

Thêm vào `vercel.json` khi deploy production:

```json
{
  "crons": [
    {
      "path": "/api/cron/publish-scheduled",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Và cấu hình `CRON_SECRET` trên Vercel.

## Kiểm tra thủ công

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/publish-scheduled
```
