# Đổi thương hiệu: ChapChap → ChapMee

> Checklist rà soát metadata/SEO/PWA: **[chapmee-brand-checklist.md](./chapmee-brand-checklist.md)**  
> Kế hoạch Studio (sau rename): **[chapmee-studio-plan.md](./chapmee-studio-plan.md)**

| | |
|---|---|
| **Tên cũ** | ChapChap |
| **Tên mới** | **ChapMee** |
| **Logo** | `public/brand/chapmee-wordmark.png` (wordmark 1107×292) |
| **Favicon / icon** | `public/favicon.png` (vuông 1254×1254, ee + sách) |

---

## 1. Nguồn sự thật (single source of truth)

| File | Mục đích |
|------|----------|
| `lib/brand/constants.ts` | `BRAND_NAME`, `BRAND_LOGO_PATH`, tỷ lệ logo |
| `lib/seo/metadata.ts` | `SITE_NAME`, `DEFAULT_SITE_TITLE`, `DEFAULT_SITE_DESCRIPTION`, OG/Twitter |
| `components/brand/ChapMeeLogo.tsx` | Component logo dùng chung header |

**Quy tắc:** UI/metadata mới import `BRAND_NAME` hoặc `ChapMeeLogo`, không hard-code "ChapChap".

---

## 2. Đã hoàn thiện

### Logo & PWA

- `public/brand/chapmee-wordmark.png` — wordmark ChapMee (`BRAND_ASSET_VERSION` để bust cache mobile)
- `/logo.png` redirect sang path mới (next.config)
- `public/favicon.png`, `app/icon.png`, `app/apple-icon.png` — icon vuông từ `ĐỒ HOẠ/favicon.png`
- `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — cùng favicon vuông (PWA / Apple)
- `public/og-default.svg` — OG mặc định gradient cam/hồng + chữ ChapMee
- `app/manifest.ts` — `name` / `short_name` = ChapMee, icon chính `/logo.png`
- `app/layout.tsx` — `appleWebApp.title`, favicon/apple icons
- `components/layout/DesktopHeader.tsx`, `MobileTopBar.tsx` — `ChapMeeLogo`
- `components/studio/StudioTopbar.tsx` — logo + Studio

### UI & copy (toàn app)

- Toàn bộ chuỗi **ChapChap** trong `app/`, `components/`, `lib/` (`.ts`/`.tsx`) → **ChapMee**
- Metadata trang: discover, truyện, story, rankings, community guidelines, landing, v.v.
- Thông báo, moderation, báo cáo, share card (`renderShareImage`), contact mặc định
- Fallback tác giả / độc giả: "Tác giả ChapMee", "Độc giả ChapMee", v.v.

### LocalStorage / session (có migrate)

Prefix mới `chapmee:` — đọc key cũ `chapchap*` một lần rồi chuyển:

- `lib/brand/storage.ts` + `lib/client/session-cache.ts` (legacy session)
- Áp dụng: coin balance, top bar, message unread, reading prefs, privacy, notifications extended, experiments, poll votes

### Server / URL

- `lib/brand/site-origin.ts` — `getSiteOrigin()` từ `NEXT_PUBLIC_SITE_URL` (không còn `chapchap.local`)
- `followStory`, `createComment`, `milestones` dùng `getSiteOrigin()`

### Env (tương thích ngược)

- `lib/env/legacy-env.ts` — đọc `CHAPMEE_*` trước, fallback `CHAPCHAP_*`
- `.env.example` ghi cả hai tên
- `CHAPMEE_SUPABASE_TIMEOUT_MS`, `CHAPMEE_SKIP_REMOTE_CONFIG`, `CHAPMEE_RUNTIME_PLATFORM`
- Header runtime: `x-chapmee-runtime-platform` (+ fallback cũ)

### Admin / export (tên file hiển thị)

- CSV export: `chapmee-{type}-{date}.csv`
- Share filename fallback: `chapmee-share.png`
- Placeholder liên hệ admin: `@chapmee.vn`, social `chapmee`

### Database (migration mới)

- `supabase/migrations/071_brand_chapmee_content.sql`
  - `badges.description`: replace ChapChap → ChapMee
  - `app_settings.contact_description` (key contact_feedback)

Chạy trên staging/production khi sẵn sàng:

```bash
npx supabase db push
```

---

## 3. Cố ý giữ nguyên (kỹ thuật / hợp đồng bên thứ ba)

| Hạng mục | Lý do |
|----------|--------|
| `package.json` name `chapchap` | Đổi có thể ảnh hưởng tooling/CI; không ảnh hưởng UI |
| Migration SQL cũ (`013`, `014`, `051`, …) | Lịch sử; đã có `071_*` cập nhật dữ liệu |
| Google Play `com.chapchap.app`, SKU `chapchap_coin_*` | ID store — đổi = app listing mới |
| Email test RBAC `*@chapchap.test` | Môi trường dev |
| Supabase bucket / project name | Hạ tầng đang chạy |

---

## 4. Kiểm tra sau deploy

```powershell
# Không còn ChapChap trong source UI
Get-ChildItem app,components,lib -Recurse -Include *.tsx,*.ts |
  Select-String -Pattern 'ChapChap' -SimpleMatch

npm run lint
npm run build
```

Trình duyệt:

1. Trang chủ / Discover — logo wordmark, không méo (height cố định, width auto)
2. View source / tab — title `… | ChapMee`
3. `/manifest.webmanifest` — name ChapMee
4. Studio, Creator, Profile — copy ChapMee
5. (Sau `db push`) Badge / contact trong app settings

---

## 5. TODO tùy chọn

- [ ] Favicon SVG maskable tách khỏi wordmark (icon vuông cho PWA đẹp hơn)
- [ ] Domain production + email `support@chapmee.vn` thật
- [ ] Cập nhật `docs/aso/chapchap-aso-v1.md` → listing store ChapMee
- [ ] Play Console package rename (dự án riêng)

---

*Tài liệu cập nhật sau đợt hoàn thiện logo + rebrand.*
