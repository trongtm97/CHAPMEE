# Kế hoạch ChapMee Studio

> **Tài liệu hiện hành** cho khu vực tác giả sau rebrand ChapMee.  
> Chuẩn đặt tên ngắn: [studio-naming-standard.md](./studio-naming-standard.md)  
> QA rename: [chapmee-rename-qa-report.md](./chapmee-rename-qa-report.md)  
> Lịch sử kiến trúc cũ: [creator-studio-plan.md](./creator-studio-plan.md) (lưu tham khảo, không dùng tên Creator Studio trong UI mới).

---

## 1. Định danh

| Khái niệm | Giá trị |
|-----------|---------|
| **Nền tảng** | ChapMee |
| **Khu tác giả (đầy đủ)** | **ChapMee Studio** |
| **Nhãn UI ngắn** | **Studio** |
| **Người dùng** | **Tác giả** / **người viết** |
| **Route gốc** | `/studio` |

### UI — dùng

ChapMee, ChapMee Studio, Studio, Tác giả, người viết, Tổng quan Studio, Thống kê Studio, Cài đặt Studio.

### UI — không dùng

ChapChap, ChapChap Studio, Creator, Creator Studio, Creater, Dashboard Creator, Creator Dashboard, Creator tools.

### Code nội bộ — giữ (RBAC / DB)

`creator_id`, `creator_profiles`, `creator_role`, `getCreatorProfile`, `CreatorDashboard` (tên component), analytics `targetType: "creator"`. Chỉ đổi **chuỗi hiển thị** và **URL ưu tiên** (`studioPath()` trong `lib/studio/constants.ts`).

---

## 2. Route

### 2.1. Route đang có (canonical)

| Route | Trạng thái | Ghi chú |
|-------|------------|---------|
| `/studio` | ✅ | Tổng quan — `StudioDashboard` |
| `/studio/setup` | ✅ | Bật hồ sơ tác giả lần đầu |
| `/studio/status` | ✅ | Trạng thái kiểm duyệt |
| `/studio/stories` | ✅ | Danh sách truyện |
| `/studio/stories/new` | ✅ | Tạo truyện |
| `/studio/stories/[storyId]/edit` | ✅ | Sửa truyện |
| `/studio/stories/[storyId]/episodes` | ✅ | Quản lý **chương** (segment URL: `episodes`) |
| `/studio/stories/[storyId]/episodes/new` | ✅ | Chương mới |
| `/studio/stories/[storyId]/episodes/[episodeId]/edit` | ✅ | Sửa chương |
| `/studio/stories/.../episodes/.../preview` | ✅ | Xem trước (đọc / Swipe) |
| `/studio/analytics` | ✅ | Thống kê Studio |
| `/studio/settings` | ✅ | Hồ sơ tác giả |

**Lưu ý thuật ngữ:** Trong URL và DB dùng `episodes`; trên UI hiển thị **chương** / **chap**. Alias `/chapters` có thể bổ sung sau (redirect → `episodes`).

### 2.2. Route kế hoạch (redirect tạm — `next.config.ts`)

Chưa có page riêng; redirect an toàn, không 404:

| Route kế hoạch | Redirect hiện tại | Module tương lai |
|----------------|-------------------|------------------|
| `/studio/drafts` | → `/studio/stories` | Nháp tập trung |
| `/studio/calendar` | → `/studio` (`#lich-dang`) | Lịch đăng |
| `/studio/templates` | → `/studio/settings` | Mẫu nội dung |
| `/studio/swipe` | → `/studio/stories` | Swipe Generator |
| `/studio/comments` | → `/studio` | Cộng đồng tác giả |
| `/studio/monetization` | → `/studio` | Kiếm tiền (hub) |

### 2.3. Legacy `/creator`

| Legacy | Đích |
|--------|------|
| `/creator` | `/studio` |
| `/creator/*` | `/studio/*` (cùng suffix) |
| `/creator/calendar`, `/drafts`, `/templates`, `/swipe` | Như bảng redirect Studio ở trên |
| `/me/creator` | `/studio` |

File `app/creator/**` giữ `redirect()` dự phòng.

### 2.4. Không đổi

- `/creators/[id]` — hồ sơ **tác giả** công khai (không phải Studio)
- `/write` — redirect tạo truyện → `/studio/stories/new`

---

## 3. Navigation Studio

Nguồn code: `lib/studio/navigation.ts` → `StudioSidebar`.

| Mục | Href |
|-----|------|
| Tổng quan | `/studio` |
| Truyện | `/studio/stories` |
| Chương | `/studio/stories` (hub; chọn truyện → quản lý chương) |
| Nháp | `/studio/drafts` → redirect stories |
| Lịch đăng | `/studio#lich-dang` |
| Mẫu | `/studio/templates` → redirect settings |
| Swipe | `/studio/swipe` → redirect stories |
| Thống kê | `/studio/analytics` |
| Cài đặt | `/studio/settings` |

Shell: `StudioLayout`, `StudioTopbar`, `StudioSidebar` (`components/studio/*`).

---

## 4. Module Studio (roadmap tính năng)

Thứ tự ưu tiên cho các prompt triển khai sau rename:

| # | Module | Mô tả | Route / vị trí | Trạng thái |
|---|--------|--------|----------------|------------|
| 1 | **Tổng quan Studio** | Stats, viết tiếp, việc cần làm | `/studio` | ✅ Có |
| 2 | **Quản lý truyện** | CRUD, filter, tìm kiếm | `/studio/stories` | ✅ Có |
| 3 | **Quản lý chương** | Danh sách / sửa / gửi duyệt | `.../episodes` | ✅ Có |
| 4 | **Nháp và autosave** | Hub nháp, autosave editor | `/studio/drafts` | 🔶 Redirect; autosave trong editor |
| 5 | **Lịch đăng** | Chương hẹn giờ | `#lich-dang` trên dashboard | 🔶 Card có; chưa route riêng |
| 6 | **Trình soạn thảo** | Story + chapter editor | edit / new pages | ✅ Có (Studio form) |
| 7 | **Ảnh trong chương** | Upload / regenerate | API + form | ✅ Có |
| 8 | **Mẫu nội dung** | Template chương/truyện | `/studio/templates` | ⏳ Chưa |
| 9 | **SEO** | Meta truyện/chương | Trong form truyện | 🔶 Một phần |
| 10 | **Swipe Generator** | Preview swipe, ảnh nền | preview `?mode=swipe` | 🔶 Có preview |
| 11 | **Nhập hàng loạt** | Import file | — | ⏳ Disabled UI |
| 12 | **Thống kê** | Reads, engagement | `/studio/analytics` | ✅ Có |
| 13 | **Cộng đồng cho tác giả** | Comment / fan tools | `/studio/comments` | ⏳ |
| 14 | **Kiếm tiền** | Tip, paid chap, payout | Hub `/creator` cũ → gom Studio | 🔶 Rải trên dashboard legacy |
| 15 | **QA trước khi đăng** | Checklist gửi duyệt | `EpisodeWritingChecklist` | 🔶 Có một phần |

Chú thích: ✅ hoạt động · 🔶 một phần · ⏳ chưa / placeholder.

---

## 5. Cấu trúc code (tham chiếu prompt)

```
app/studio/
  layout.tsx                 # Passthrough
  setup/page.tsx             # Ngoài workspace shell
  (workspace)/
    layout.tsx               # StudioLayout + auth
    page.tsx                 # Tổng quan
    stories/...
    analytics/page.tsx
    settings/page.tsx
    status/page.tsx

components/studio/           # Shell, form, table
components/creator/          # Dashboard, analytics (UI đã Việt hóa / ChapMee Studio)

lib/studio/
  constants.ts               # STUDIO_* , studioPath()
  navigation.ts              # STUDIO_NAV_ITEMS
  messages.ts                # Lỗi tiếng Việt
  ownership.ts               # Link owner reader → Studio
```

Export alias: `StudioDashboard` ← `CreatorDashboard`.

---

## 6. Metadata

- Trang tổng quan: `ChapMee Studio — Tổng quan Studio`
- `STUDIO_FULL_NAME`, `STUDIO_TAGLINE` trong `lib/studio/constants.ts`
- Không dùng "Creator" trong `generateMetadata` Studio.

---

## 7. Checklist trước khi làm tính năng Studio mới

1. Nhãn UI: Studio / ChapMee Studio / Tác giả — không Creator/ChapChap.
2. Link: `studioPath('/...')` hoặc `STUDIO_BASE_PATH`.
3. Redirect legacy `/creator/...` nếu thêm route song song.
4. Cập nhật bảng module §4 trong PR / doc.
5. Chạy `npm run build` sau thay đổi route.

---

## 8. Liên kết tài liệu

| File | Mục đích |
|------|----------|
| [chapmee-studio-plan.md](./chapmee-studio-plan.md) | **Kế hoạch hiện hành** (file này) |
| [studio-naming-standard.md](./studio-naming-standard.md) | Quy tắc đặt tên UI |
| [brand-rename-chapmee.md](./brand-rename-chapmee.md) | Rebrand toàn app |
| [chapmee-brand-checklist.md](./chapmee-brand-checklist.md) | Metadata / PWA |
| [chapmee-rename-qa-report.md](./chapmee-rename-qa-report.md) | QA sau rename |
| [creator-studio-plan.md](./creator-studio-plan.md) | Lịch sử / audit cũ |

---

*Cập nhật: 29/05/2026 — đồng bộ sau QA rename ChapMee.*
