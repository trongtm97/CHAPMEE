# Checklist thương hiệu ChapMee

Tài liệu rà soát metadata, SEO, PWA, thông báo, liên hệ và config hiển thị sau khi đổi **ChapChap → ChapMee**.

Liên quan: [brand-rename-chapmee.md](./brand-rename-chapmee.md), [studio-naming-standard.md](./studio-naming-standard.md), [chapmee-studio-plan.md](./chapmee-studio-plan.md).

---

## Tên chính thức

| Khái niệm | Hiển thị |
|-----------|----------|
| App / nền tảng | **ChapMee** |
| Khu tác giả (đầy đủ) | **ChapMee Studio** |
| Nhãn ngắn UI | **Studio** |
| Người viết | **Tác giả** / người viết |
| Route Studio | `/studio` |

**UI không dùng:** ChapChap, Creator Studio, Creater, Creator (vai trò người dùng).

---

## Nguồn sự thật (code)

| File | Mục đích |
|------|----------|
| `lib/brand/constants.ts` | `BRAND_NAME` (có thể override `NEXT_PUBLIC_APP_NAME`) |
| `lib/seo/metadata.ts` | `DEFAULT_SITE_TITLE`, `DEFAULT_SITE_DESCRIPTION`, `PWA_MANIFEST_DESCRIPTION`, `buildDefaultMetadata()` |
| `app/layout.tsx` | Root metadata + PWA icons |
| `app/manifest.ts` | Web App Manifest |
| `public/og-default.svg` | Ảnh OG/Twitter mặc định (chữ ChapMee) |

### Metadata mặc định (đã chuẩn hóa)

- **Title:** `ChapMee - Nền tảng giải trí truyện thế hệ mới`
- **Description:** `ChapMee là nền tảng đọc, viết và khám phá truyện theo phong cách hiện đại, kết hợp Swipe, cộng đồng và công cụ Studio cho tác giả.`
- **Template trang con:** `%s | ChapMee`
- **PWA manifest:** `name` / `short_name` = ChapMee; mô tả ngắn qua `PWA_MANIFEST_DESCRIPTION`

### OpenGraph / Twitter

- `og:siteName` = ChapMee (`SITE_NAME`)
- Title/description mặc định dùng hằng số trên
- Ảnh mặc định: `/og-default.svg` (đã ghi ChapMee; không còn ChapChap)

---

## Đã rà soát / đổi (đợt metadata)

### Metadata & SEO

- [x] `lib/seo/metadata.ts` — title/description mặc định ChapMee
- [x] `app/manifest.ts` — PWA name + description
- [x] `public/og-default.svg` — copy ChapMee
- [x] Trang public: discover, truyện, story/chapter, genre, rankings, community, landing, Studio, profile, guidelines — suffix **ChapMee** hoặc **ChapMee Studio**
- [x] Sửa metadata tiếng Anh còn sót: `me/[userId]`, collections, author, genre not-found

### Thông báo & liên hệ

- [x] `lib/notifications/*` — copy ChapMee / Studio (mock + message moderation)
- [x] `lib/settings/default-contact-settings.ts` — Liên hệ & Góp ý ChapMee
- [x] `components/admin/settings/ContactSettingsForm.tsx` — admin copy ChapMee

### UI (đợt trước + sót)

- [x] Navigation, Studio entry, profile badge **Tác giả**
- [x] `components/stories/StoryHero.tsx` — bỏ "ChapMee creator"

### Env (chỉ hiển thị)

- [x] `.env.example` — `NEXT_PUBLIC_APP_NAME=ChapMee`
- [x] `BRAND_NAME` đọc `NEXT_PUBLIC_APP_NAME` nếu có

### Noindex

**Không đổi logic.** Các trang draft / admin / editor / not-found vẫn `robots: { index: false }` như trước.

---

## Technical legacy — giữ tạm (không đổi bừa)

| Vùng | Lý do |
|------|--------|
| `lib/brand/storage.ts` — key `chapchap:*` legacy | Migrate sang `chapmee:`; giữ đọc key cũ |
| `CHAPCHAP_*` env fallback | Deploy cũ vẫn chạy (`lib/env/legacy-env.ts`) |
| `package.json` name `chapchap` | Tooling/npm; không ảnh hưởng UI |
| `com.chapchap.app`, SKU `chapchap_coin_*` | Google Play / store ID thật |
| `test_*@chapchap.test` | RBAC dev |
| `x-chapchap-runtime-platform` header | API contract nội bộ |
| Supabase project name `chapchap` (`.temp/linked-project.json`) | Tên project cloud |
| SQL migrations cũ (`013_badges`, `051_app_settings`, …) | Lịch sử DB; nội dung runtime đã có `071_brand_chapmee_content.sql` |
| `scripts/rbac-*` — `ChapChapTest!2026` | Mật khẩu test dev |
| Admin dashboard — nhãn tiếng Anh (Creator revenue, …) | Nội bộ staff; có thể Việt hóa sau |

---

## TODO sau (ngoài repo hoặc cần asset mới)

- [ ] **Domain** — cập nhật `NEXT_PUBLIC_SITE_URL` khi có domain ChapMee production
- [ ] **Ảnh OG/Social** — nếu marketing có banner riêng (file hiện tại `og-default.svg` đã ChapMee; có thể thay design sau)
- [ ] **Supabase Auth email templates** — welcome / reset password trên dashboard Supabase (không nằm trong repo)
- [x] **Email transactional** — Postfix + OpenDKIM VPS; `docs/EMAIL_PRODUCTION_SETUP.md`, `scripts/deploy/setup-postfix-mail.sh`
- [ ] **Google Play / App Store** — listing `com.chapchap.app` → đổi khi publish app mới
- [ ] **ASO docs** — `docs/aso/chapchap-aso-v1.md` → bản ChapMee
- [ ] **Admin UI** — Việt hóa nhãn finance/growth còn "Creator …" (tùy chọn)

---

## Lệnh audit (PowerShell)

```powershell
# UI/metadata — kỳ vọng: 0 kết quả trong app/components/lib (trừ comment legacy)
Get-ChildItem -Recurse app,components,lib -Include *.ts,*.tsx |
  Select-String -Pattern 'ChapChap' -SimpleMatch

Get-ChildItem -Recurse app,components,lib -Include *.ts,*.tsx |
  Select-String -Pattern 'Creater' -SimpleMatch

Get-ChildItem -Recurse app,components,lib -Include *.ts,*.tsx |
  Select-String -Pattern 'Creator Studio' -SimpleMatch

# Creator: phân loại — role/DB/import vs UI
Get-ChildItem -Recurse app,components,lib -Include *.ts,*.tsx |
  Select-String -Pattern 'Creator' |
  Where-Object { $_.Line -notmatch 'creatorProfile|creatorId|creator_|getCreator|CreatorDashboard|CreatorStory|/creators/' }
```

### Kết quả audit (tháng 5/2026)

| Pattern | `app/` `components/` `lib/` | Ghi chú |
|---------|---------------------------|---------|
| ChapChap | 0 | Chỉ còn trong `docs/`, `scripts/`, migrations, legacy storage |
| chapchap | Legacy keys/env/SKU | Xem bảng technical legacy |
| Creater | 0 trong source | Chỉ `docs/studio-naming-standard.md` |
| Creator Studio | 0 trong source UI | Chỉ `docs/creator-studio-plan.md` |

---

## Validation thủ công

1. `npm run dev` → mở `/` → tab title ~ **ChapMee - Nền tảng…**
2. View source / DevTools → `og:site_name` = ChapMee
3. `/manifest.webmanifest` → name ChapMee, description tiếng Việt
4. `/discover`, `/truyen/[slug]`, `/the-loai/[slug]` → title có ChapMee
5. `/studio` → ChapMee Studio
6. `/community-guidelines` → Quy định \| ChapMee
7. Tôi → Góp ý / Liên hệ → copy ChapMee
8. `npm run build` (nếu CI có) — không lỗi type do metadata
