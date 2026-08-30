# ChapMee — Local setup (PostgreSQL + Better Auth + MinIO)

Sau khi chạy `npm run db:legacy` thành công, làm các bước sau để chạy app local.

## 1. Docker services

```powershell
npm run docker:local:up
```

(Lệnh này dùng `--env-file .env.local` để `PGRST_JWT_SECRET` khớp `POSTGREST_JWT_SECRET`.)

Services: Postgres `:5432`, PostgREST `:54321`, Redis `:6379`, MinIO API `:9000` / console `:9001`.

## 2. Environment (`.env.local`)

Sao chép từ `.env.example` nếu chưa có:

```powershell
copy .env.example .env.local
```

**Bắt buộc chỉnh:**

| Biến | Ghi chú |
|------|---------|
| `BETTER_AUTH_SECRET` | Không dùng placeholder. Tạo secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `DATABASE_URL` | Khớp `docker-compose.local.yml` (mặc định `chapmee` / `chapmee_local_password`) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `APP_URL` / `BETTER_AUTH_URL` | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Tùy chọn nếu muốn bật đăng nhập Google |
| `GOOGLE_CLIENT_SECRET` | Tùy chọn nếu muốn bật đăng nhập Google |
| `S3_*` | Khớp MinIO trong compose |
| `POSTGREST_JWT_SECRET` | Khớp `PGRST_JWT_SECRET` trong `docker-compose.local.yml` |

**Có thể xóa** (không còn dùng runtime): `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`.

## 3. Database (đã xong phần legacy)

Nếu DB mới hoàn toàn:

```powershell
npm run db:migrate    # drizzle 0000–0005 (foundation — trước legacy)
npm run db:migrate:status   # xem migration nào chưa apply
npm run db:legacy     # ~198 migrations trong db/migrations/legacy
npm run db:legacy:status   # xem legacy migration nào chưa apply
npm run db:shims      # drizzle 0006+ (sau legacy — cần bảng stories, storage_assets)
```

**DB đã có schema legacy** (migrate từ Supabase trước đó, hoặc `db:legacy` từng chạy nhưng chưa có tracking):

```powershell
npm run db:legacy:stamp   # đánh dấu 197 file legacy đã apply (một lần)
npm run db:legacy         # chỉ chạy file legacy mới (nếu có)
```

Hoặc một lệnh:

```powershell
npm run db:setup
```

## 4. Kiểm tra stack

```powershell
npm run verify:local
```

## 5. Chạy app

```powershell
npm install --legacy-peer-deps
npm run dev
```

Mở http://localhost:3000 — thử **Đăng ký / Đăng nhập**, upload ảnh bìa/chương trong Studio.

### Google OAuth local (tùy chọn)

Nếu muốn bật `Tiếp tục với Google`:

1. Tạo OAuth Client trong Google Cloud Console.
2. Chọn `Web application`.
3. Thêm redirect URI local:
   - `http://localhost:3000/api/auth/callback/google`
4. Điền `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` vào `.env.local`.

Production dùng redirect URI:
- `https://YOUR_DOMAIN/api/auth/callback/google`

**MinIO:** service `minio-init` tạo bucket `chapmee-local-media` (public read). Console: http://localhost:9001 (`chapmee_minio` / `chapmee_minio_password`).

**Backup DB:** `bash scripts/backup-local-db.sh` → `backups/db/`.

**Migrate lên VPS/S3:** xem [LOCAL_MEDIA_MIGRATION.md](./LOCAL_MEDIA_MIGRATION.md). Không dùng `docker compose down -v` nếu muốn giữ dữ liệu.

**Presign từ client (tuỳ chọn):** `uploadFileViaMediaPresign()` trong `lib/media/client-presign-upload.ts` — Studio hiện vẫn dùng server upload (ổn cho MVP).

**Kiểm tra media:** `npm run media:check` · `npm run media:manifest`

## 6. Seed dữ liệu demo (khuyến nghị)

Sau `db:setup`, tạo user mẫu + 10 truyện published + tập đọc thử:

```powershell
npm run db:seed
```

Tài khoản (mật khẩu mặc định `ChapChapDev!2026`, đổi bằng `--password` hoặc `SEED_DEMO_PASSWORD`):

| Email | Vai trò |
|-------|---------|
| `reader@chapchap.local` | reader |
| `creator@chapchap.local` | creator + verified, có truyện seed |
| `admin@chapchap.local` | admin (profile founder) |

Thêm user RBAC test (`test_*@chapchap.test`):

```powershell
npm run db:seed:rbac
```

Chỉ tạo lại user, không chạy lại SQL truyện: `npm run db:seed -- --skip-content`

Bài viết mẫu cho trang `/bai-viet` (6 bài published + tag `featured`):

```powershell
npm run db:seed -- --with-content-posts
```

## 7. Tạo admin thủ công (tùy chọn)

Dùng `admin@chapchap.local` sau seed, hoặc gán role trong UI admin.

## Sửa user đăng ký trước khi có hook sync (tùy chọn)

Nếu đã có tài khoản trong bảng `user` nhưng thiếu `auth.users` / `profiles`:

```powershell
npm run db:repair-auth-users
```

## Gán username cho profile cũ (tùy chọn)

Nếu tài khoản thiếu `username` hoặc username không đúng chuẩn `/@username`:

```powershell
npm run profiles:backfill-usernames
```

Xem trước không ghi DB: `npm run profiles:backfill-usernames -- --dry-run`

## Storage lớn (chapter S3, import, search)

Sau `npm run db:migrate` (gồm `0008` chapter S3, `0009` import, `0010` episode search):

```powershell
npm run storage:health
npm run test:chapter-content
npm run verify:local
```

| Việc | Lệnh / URL |
|------|------------|
| Admin overview | `/admin/storage` |
| Import pipeline | `/admin/imports` |
| Backfill chapter → S3 | `npm run backfill:chapter-content -- --dry-run` |
| Integrity | `npm run storage:check-chapters` |

`REDIS_URL` (optional): cache chapter `chapter-content:{id}:{hash}` — xem [docs/STORAGE_LIFECYCLE.md](./docs/STORAGE_LIFECYCLE.md).

## Import pipeline (admin, tùy chọn)

1. Mở `/admin/imports` — upload `.json` / `.txt` / `.md` (tick quyền bản quyền).
2. Parse → review items → publish selected (draft/private mặc định).
3. CLI: `npm run import:local-file -- --file=./docs/samples/import-sample.json --owner-profile-id=<profiles.uuid> --source-name=test --rights --parse`

Chi tiết: [docs/IMPORT_PIPELINE.md](./docs/IMPORT_PIPELINE.md).

## Troubleshooting

| Triệu chứng | Gợi ý |
|-------------|--------|
| "Could not initialize profile" khi đăng ký | Chạy `npm run db:repair-auth-users`, restart `npm run dev`, đăng ký lại hoặc đăng nhập |
| `/me` Runtime Error `{message, code}` | `POSTGREST_JWT_SECRET` trong `.env.local` **phải khớp** Docker; chạy `npm run docker:local:recreate:postgrest` rồi restart dev |
| Log `JWSError JWSInvalidSignature` | Secret JWT app ≠ PostgREST — sửa như trên |
| `/me` lỗi "Could not refresh lifecycle state" | Restart `npm run dev` (đã xử lý fallback) |
| 401 sau login | Kiểm tra `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |
| PostgREST lỗi | `docker compose -f docker-compose.local.yml ps`, `POSTGREST_URL` |
| `/admin/taxonomy` trống hoặc `permission denied for table taxonomy_terms` | Chạy `npm run db:migrate` (migration `0027_postgrest_service_role_table_grants.sql` cấp quyền bảng cho JWT `service_role`) |
| Upload lỗi | MinIO bucket `chapmee-local-media`, `S3_FORCE_PATH_STYLE=true` |
| Resume migration | `$env:LEGACY_FROM="067_messages_realtime.sql"; npm run db:legacy` |

Chi tiết deploy VPS: [DEPLOY_VIETNIX.md](./DEPLOY_VIETNIX.md).
