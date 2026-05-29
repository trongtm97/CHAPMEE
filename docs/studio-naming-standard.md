# Chuẩn đặt tên — ChapMee Studio

> Kế hoạch module & roadmap: **[chapmee-studio-plan.md](./chapmee-studio-plan.md)**

| | |
|---|---|
| **Ứng dụng** | ChapMee |
| **Khu viết truyện (đầy đủ)** | **ChapMee Studio** |
| **Tên ngắn trên UI** | **Studio** |
| **Người dùng** | **Tác giả** / **người viết** |
| **Route chính** | `/studio` |

---

## UI — dùng

- ChapMee Studio (tiêu đề khu vực, metadata trang Studio)
- Studio (menu, nút, nhãn ngắn)
- Tác giả / người viết (vai trò hiển thị)
- Tổng quan Studio, Thống kê Studio, Cài đặt Studio (mục con)

## UI — không dùng

- Creator
- Creater (sai chính tả — sửa triệt để nếu còn)
- Creator Studio
- ChapChap Studio

---

## Route

| Route | Mục đích |
|-------|----------|
| `/studio` | Tổng quan |
| `/studio/stories` | Danh sách truyện |
| `/studio/stories/new` | Tạo truyện |
| `/studio/stories/[storyId]/edit` | Sửa truyện |
| `/studio/stories/[storyId]/episodes` | Quản lý chương |
| `/studio/stories/[storyId]/episodes/new` | Chương mới |
| `/studio/stories/[storyId]/episodes/[episodeId]/edit` | Sửa chương |
| `/studio/analytics` | Thống kê |
| `/studio/settings` | Cài đặt / hồ sơ tác giả |
| `/studio/setup` | Bật hồ sơ tác giả (lần đầu) |
| `/studio/status` | Trạng thái kiểm duyệt |
| `/studio/drafts` | Redirect → `/studio/stories` (nháp — page riêng sau) |
| `/studio/calendar` | Redirect → `/studio` (anchor `#lich-dang`) |
| `/studio/templates` | Redirect → `/studio/settings` |
| `/studio/swipe` | Redirect → `/studio/stories` |
| `/studio/comments` | Redirect → `/studio` (sau) |
| `/studio/monetization` | Redirect → `/studio` (sau) |

### Legacy `/creator`

- `/creator` → redirect `/studio`
- `/creator/*` → redirect `/studio/*` (cùng path phía sau)
- Giữ route file `app/creator/*` chỉ để redirect — không hiển thị UI cũ.

### Không đổi (public / khác nghĩa)

- `/creators/[id]` — trang hồ sơ **tác giả** công khai (không phải Studio)
- `/me/creator` — redirect → `/studio`

---

## Code nội bộ — được giữ

Tên kỹ thuật / DB / RBAC không đổi nếu đang chạy ổn:

- `creator_id`, `creator_profiles`, `is_creator`, `creator_role`
- `creator_drafts`, `creator_templates`
- `getCreatorProfile`, `CreatorProfile`, analytics `targetType: "creator"`

Chỉ đổi **chuỗi hiển thị** và **URL ưu tiên** (`studioPath()` trong `lib/studio/constants.ts`).

---

## Navigation

Menu chính (header / sidebar / hồ sơ): nhãn **Studio**, link `/studio`.

---

## Header Studio

- **Title:** ChapMee Studio  
- **Subtitle:** Viết, quản lý và phát triển truyện của bạn.

Sidebar (`lib/studio/navigation.ts`): Tổng quan, Truyện, Chương, Nháp, Lịch đăng, Mẫu, Swipe, Thống kê, Cài đặt.

### Tổng quan Studio (`/studio`)

- Header: **ChapMee Studio** + tagline + **Tổng quan Studio**
- Section: Tổng quan Studio, Viết tiếp, Lịch đăng, Công cụ Studio
- Component: `StudioDashboard` (export từ `CreatorDashboard` — giữ logic, đổi UI)
- `/creator` → redirect `/studio`

---

*Cập nhật: thống nhất Studio sau rebrand ChapMee.*
