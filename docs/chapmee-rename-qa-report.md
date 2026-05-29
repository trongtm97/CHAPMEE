# Báo cáo QA — Đổi tên ChapChap → ChapMee

| | |
|---|---|
| **Ngày kiểm thử** | 29/05/2026 |
| **Phạm vi** | Rebrand UI, Studio (`/studio`), metadata/PWA, redirect legacy `/creator` |
| **Người thực hiện** | Agent QA (tự động + rà code) |

---

## Kết luận

**Có thể tiếp tục phát triển tính năng mới** sau đợt rename, với các lưu ý:

- Build production **`npm run build` — PASS** (sau khi sửa vài lỗi type/build phát hiện trong QA).
- UI/metadata trong `app/`, `components/`, `lib/` **không còn ChapChap / Creater / Creator Studio**.
- Redirect legacy `/creator/*` cấu hình trong `next.config.ts` + trang `app/creator/**` redirect client.
- **Chưa** có route riêng `/studio/drafts`, `/studio/calendar`, `/studio/templates`, `/studio/swipe` — legacy redirect về `/studio`, `/studio/stories` hoặc `/swipe` (không 404).
- **Lint** (`npm run lint`) vẫn **FAIL** (33 errors) — chủ yếu rule React hooks có sẵn, **không** do rename.
- **Không có** script `npm run typecheck`; `npx tsc --noEmit` sau build sạch không còn lỗi rename.

---

## 1. Keyword audit

### Kết quả trong source UI (`app/`, `components/`, `lib/` — `.ts`/`.tsx`)

| Từ khóa | Số kết quả | Ghi chú |
|---------|------------|---------|
| **ChapChap** | **0** | OK |
| **Creater** | **0** | OK |
| **Creator Studio** | **0** | OK |
| **Dashboard Creator** | **0** | OK |
| **Creator Dashboard** (UI string) | **0** | OK |

### `Creator` (phân loại)

| Loại | Ví dụ | Hành động |
|------|--------|-----------|
| Code nội bộ (OK) | `CreatorDashboard`, `getCreatorProfile`, `creatorId`, `/creators/[id]` | Giữ |
| Admin nội bộ (TODO) | `Creator bonus pools`, `Creator monetization`, `Creator user ID` | Staff-only; Việt hóa sau |
| Lỗi monetization (TODO) | `"Creator chưa đủ điều kiện..."` trong `lib/monetization/*` | Nên đổi → **Tác giả** khi hiện cho user |
| Docs lịch sử | `docs/creator-studio-plan.md`, `docs/studio-naming-standard.md` | Tài liệu kế hoạch |

### `chapchap` / `CHAPCHAP` (technical legacy — giữ)

| Vùng | Mục đích |
|------|----------|
| `lib/brand/storage.ts` | Migrate localStorage key cũ |
| `CHAPCHAP_*` env fallback | `lib/env/legacy-env.ts` |
| `package.json` name | `chapchap` — npm, không UI |
| `com.chapchap.app`, SKU coin | Store / billing |
| `*@chapchap.test` | RBAC test |
| SQL migrations cũ | Lịch sử; có `071_brand_chapmee_content.sql` |

---

## 2. Route QA

### Public (tồn tại trong build)

| Route | Trạng thái build | Ghi chú QA |
|-------|------------------|------------|
| `/` | ƒ dynamic | Trang chủ + Swipe feed |
| `/swipe` | ƒ | Tab Lướt |
| `/discover` | ƒ | Khám phá |
| `/community` | ƒ | Cộng đồng |
| `/me` | ƒ | Tôi (cần đăng nhập) |
| `/notifications` | ƒ | Thông báo |
| `/messages` | ƒ | Tin nhắn |
| `/stories/[slug]` | ƒ | Chi tiết truyện |
| `/stories/[slug]/episodes/[n]` | ƒ | Đọc chương |
| `/truyen`, `/truyen/[slug]`, `/truyen/.../chuong/[n]` | ƒ / ● | Alias SEO |
| `/genres/[slug]`, `/the-loai/[slug]` | ƒ / ● | Thể loại |
| `/profile/[username]` | ƒ | Hồ sơ công khai |
| `/creators/[creatorId]` | ƒ | Hồ sơ tác giả (URL `/creators` — không đổi) |

### Studio

| Route | Trạng thái | Ghi chú |
|-------|------------|---------|
| `/studio` | ƒ | Dashboard ChapMee Studio |
| `/studio/stories` | ƒ | Danh sách truyện |
| `/studio/stories/new` | ƒ | Tạo truyện |
| `/studio/stories/[id]/edit` | ƒ | Sửa truyện |
| `/studio/stories/[id]/episodes` | ƒ | Danh sách chương |
| `/studio/stories/.../episodes/.../edit` | ƒ | Sửa chương |
| `/studio/setup` | ƒ | Onboarding tác giả |
| `/studio/settings` | ƒ | Cài đặt Studio |
| `/studio/analytics` | ƒ | Thống kê |
| `/studio/status` | ƒ | Trạng thái tác giả |
| `/studio/drafts` | **Không có page** | Xem legacy redirect |
| `/studio/calendar` | **Không có page** | Lịch đăng = anchor `#lich-dang` trên dashboard |
| `/studio/templates` | **Không có page** | Chưa triển khai |
| `/studio/swipe` | **Không có page** | Swipe tool = link tới episodes story |

### Legacy redirect (`next.config.ts`)

| Legacy | Đích | Kỳ vọng |
|--------|------|---------|
| `/creator` | `/studio` | OK |
| `/creator/stories` | `/studio/stories` | OK |
| `/creator/calendar` | `/studio` | OK (không 404) |
| `/creator/drafts` | `/studio/stories` | OK |
| `/creator/templates` | `/studio` | OK |
| `/creator/swipe` | `/swipe` | OK |
| `/me/creator` | `/studio` | OK |
| `app/creator/**` | `redirect()` tới `/studio` hoặc tương đương | Backup nếu config redirect không chạy |

**Kiểm thử HTTP redirect:** cần `npm run dev` / `npm start` và curl/browser — chưa chạy E2E browser trong QA này.

---

## 3. Navigation QA (code review)

| Vùng | Kỳ vọng | Kết quả |
|------|---------|---------|
| Mobile bottom nav (5 tab) | Không thêm Studio | OK — Trang chủ, Khám phá, Lướt, Cộng đồng, Tôi |
| Desktop header | Studio + Viết truyện → `/studio` | OK |
| Desktop sidebar | Link **Studio** → `/studio` | OK |
| Trang Tôi | Tile **Studio** / Bắt đầu viết; card ChapMee Studio | OK |
| Story owner | **Mở trong Studio** | OK (`StoryActions`) |
| Chapter owner | **Sửa trong Studio** | OK (`ReaderActionSheet`) |
| Public profile | Badge **Tác giả** | OK |
| Onboarding tác giả | → `/studio/setup` | **Đã sửa** (trước: `/creator`) |

---

## 4. Studio QA (code / build)

| Hạng mục | Kết quả |
|----------|---------|
| Dashboard compile | OK (route `/studio` trong build) |
| Quick actions | Link `/studio/stories/new`, analytics, episodes — không crash tại build |
| Nhập hàng loạt | Disabled + badge "Sắp ra mắt" | OK |
| RBAC `getStudioAccess` | Redirect `/studio/setup` nếu chưa có profile | Giữ nguyên logic |

---

## 5. Metadata / PWA QA (code)

| Mục | Giá trị |
|-----|---------|
| `DEFAULT_SITE_TITLE` | ChapMee - Nền tảng giải trí truyện thế hệ mới |
| `DEFAULT_SITE_DESCRIPTION` | Có ChapMee + Studio |
| `og:siteName` | ChapMee (`SITE_NAME`) |
| `manifest.webmanifest` | `name` / `short_name` = ChapMee |
| `appleWebApp.title` | ChapMee (`app/layout.tsx`) |
| `public/og-default.svg` | Chữ ChapMee |

---

## 6. Auth / RBAC (không đổi logic)

- Route `/admin/*` vẫn tách khỏi shell độc giả.
- Studio: `getStudioAccess` — chỉ user có quyền/creator profile.
- Role code `creator` trong DB/RBAC **không** đổi; admin hiển thị **Tác giả** (`formatAdminRoleLabel`).

---

## 7. Build & scripts

| Script | Có trong `package.json`? | Kết quả |
|--------|---------------------------|---------|
| `npm run build` | Có | **PASS** |
| `npm run lint` | Có | **FAIL** — 53 vấn đề (33 errors), không gắn rename |
| `npm run typecheck` | **Không** | Dùng `npx tsc --noEmit` hoặc build TS step |
| `npm run dev` | Có | Không chạy trong QA (cần manual) |

---

## 8. Lỗi phát hiện & xử lý trong QA

| Lỗi | Liên quan rename? | Xử lý |
|-----|-------------------|--------|
| `lib/messages/message-rate-limit.ts` — `"use server"` + export const → build fail | Không (chặn build) | **Đã sửa** — bỏ `"use server"` |
| `lib/me/loadMePageCore.ts` — type `User` vs `getCurrentUser` | Không (chặn build) | **Đã sửa** — dùng `CurrentUserState["user"]` |
| `lib/profile/get-public-profile.ts` — `ProfileBadgeTone` | Có (badge Tác giả) | **Đã sửa** — `as const` |
| `app/onboarding` redirect `/creator` | Có | **Đã sửa** → `/studio/setup` |
| `lib/swipe/mutateSwipeEngagement` — "Creator not found" | Có (UI EN) | **Đã sửa** → tiếng Việt |

---

## 9. Lỗi còn lại / TODO

### Không chặn rename / build

- [ ] **ESLint** — 33 errors (react-hooks, jsx-in-try/catch, …) — xử lý riêng
- [ ] **Monetization error strings** — thay "Creator" → "Tác giả" trong message user-facing
- [ ] **Admin UI** — Việt hóa nhãn Creator revenue / funnel (staff)
- [ ] **E2E manual** — login tác giả/reader/admin, click từng route, xác nhận redirect 307
- [ ] **Supabase Auth email** — template trên dashboard (ngoài repo)
- [ ] **Route Studio phụ** — nếu product cần `/studio/drafts` riêng, tạo page sau (hiện redirect legacy đủ)

### Technical legacy (chấp nhận)

- `package.json` name `chapchap`
- Storage keys / env `CHAPCHAP_*`
- Google Play `com.chapchap.app`

---

## 10. Validation checklist (manual — cho dev)

- [ ] `npm run dev` → mở `/`, `/swipe`, `/discover`, `/community`, `/me`
- [ ] Mở truyện + chương của mình → Studio actions
- [ ] `/creator` → redirect `/studio`
- [ ] `/creator/drafts` → `/studio/stories`
- [ ] View Page Source → title ChapMee
- [ ] Application → Manifest → ChapMee
- [ ] User thường không vào `/admin`
- [ ] Tác giả vào `/studio` OK

---

## Tài liệu liên quan

- [chapmee-studio-plan.md](./chapmee-studio-plan.md) — kế hoạch Studio hiện hành
- [chapmee-brand-checklist.md](./chapmee-brand-checklist.md)
- [brand-rename-chapmee.md](./brand-rename-chapmee.md)
- [studio-naming-standard.md](./studio-naming-standard.md)
