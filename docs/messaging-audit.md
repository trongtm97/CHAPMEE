# ChapMee — Messaging audit

> Rà soát: 2026-05-29. Mục đích: tránh trùng bảng/component và định hướng prompt tiếp theo.

## Tóm tắt

Hệ thống **DM 1-1 MVP** đã được triển khai qua migration `061_messages_system.sql` + `062_message_reports_requests.sql`. Không có route `/chat` hay `/inbox` riêng. **Không** trùng bảng DM (khác `feedback_messages` = góp ý app).

| Trạng thái | Mô tả |
|-----------|--------|
| Có | Routes, 14 UI components, 15 lib modules, 7 bảng messaging, RLS bật, server actions |
| Thiếu (chủ ý MVP) | Realtime, group chat, file/ảnh, E2E, polling |
| Đã sửa (063) | RLS participant: chặn tự join conversation người khác; RPC tạo hội thoại 2 người |

---

## 1. Routes

| Route | Tồn tại | Ghi chú |
|-------|---------|---------|
| `/messages` | Có | Inbox + tab yêu cầu (`?tab=requests`) |
| `/messages/[conversationId]` | Có | Chi tiết hội thoại |
| `/me/settings/messages` | Có | Privacy tin nhắn |
| `/admin/moderation/messages` | Có | Hàng chờ báo cáo DM |
| `/api/messages/unread` | Có | Badge unread (client poll) |
| `/profile/[username]` | Có | Nút **Nhắn tin** (`StartMessageButton`) |
| `/chat` | Không | — |
| `/inbox` | Không | Dùng `/messages` |
| `/me/messages` | Không | Dùng `/messages` + `/me/settings/messages` |

**Layout:** `app/messages/layout.tsx` (auth + `MobileBackHeader`).

**Nav:** `DesktopHeader`, `MobileTopBar` (`MessageIconButton`), `SettingsQuickCard`.

---

## 2. Components (`components/messages/`)

| Component | Trạng thái | Vai trò |
|-----------|------------|---------|
| `MessagesShell` | Hoạt động | Layout 2 cột desktop |
| `InboxList` | Hoạt động | Danh sách hội thoại |
| `InboxPage` | Hoạt động | Placeholder mobile / thông báo đã gửi request |
| `MessageRequestList` | Hoạt động | Tab yêu cầu |
| `MessageRequestCard` | Hoạt động | Chấp nhận / từ chối / chặn / báo cáo |
| `ConversationPage` | Hoạt động | Header + bubbles + composer |
| `MessageBubble` | Hoạt động | Hiển thị tin |
| `MessageComposer` | Hoạt động | Gửi tin (server action) |
| `ConversationActionMenu` | Hoạt động | Mute, block, báo cáo, lưu trữ |
| `StartMessageButton` | Hoạt động | Từ profile công khai |
| `MessageIconButton` | Hoạt động | Badge unread |
| `MessagePrivacySettings` | Hoạt động | Form cài đặt |
| `ReportMessageDialog` | Hoạt động | Báo cáo trong hội thoại |
| `ReportMessageRequestDialog` | Hoạt động | Báo cáo yêu cầu chưa accept |

**Admin:** `components/admin/MessageModerationQueue.tsx` — hoạt động.

**Không có** component mock/TODO riêng; không có folder `components/chat/`.

**Liên quan nhưng không phải DM:** `components/notifications/*`, `ProfilePrivacySettings` (`allowDm` đồng bộ với message privacy).

---

## 3. Database

### Bảng messaging (061 + 062)

| Bảng | Migration | Mục đích |
|------|-----------|----------|
| `conversations` | 061 | Hội thoại direct, `status`, preview |
| `conversation_participants` | 061 | Thành viên, read/mute/archive |
| `messages` | 061 | Nội dung tin (text, max 1000) |
| `message_requests` | 061 | Tin nhắn người lạ chờ duyệt |
| `message_blocks` | 061 | Chặn user |
| `message_reports` | 061, 062 | Báo cáo (+ `message_request_id` nullable) |
| `message_privacy_settings` | 061 | Ai được nhắn, filter, chặn link |

### Bảng liên quan (không trùng)

| Bảng | Khác messaging |
|------|----------------|
| `feedback_messages` | Góp ý / liên hệ app (051) |
| `notifications` | Thông báo chung (024+) |
| `reports` | Báo cáo nội dung cộng đồng (khác `message_reports`) |
| `account_restrictions` | Mở rộng `message_block_*`, `message_banned` (061) |
| `profile_privacy_settings.allow_dm` | Cờ tổng quát; đồng bộ với `message_privacy_settings` |
| `rate_limit_events` | Key `message_request` trong app |

**Không tạo thêm bảng DM** trừ khi feature mới (vd. group → bảng riêng sau).

### RPC / helpers (061, 063)

- `is_conversation_participant(conv_id, user_id)`
- `is_message_blocked(a, b)`
- `create_direct_conversation(other_user_id)` — **063**, tạo/join DM an toàn

---

## 4. Lib & server actions

### `lib/messages/`

| Module | Có | Ghi chú |
|--------|-----|---------|
| `get-inbox.ts` | Có | `getInboxConversations`, `getMessageUnreadCount` |
| `get-conversation.ts` | Có | `getConversationDetail` (+ filter sensitive) |
| `get-message-requests.ts` | Có | `getPendingMessageRequests` |
| `send-message.ts` | Có | Rate limit, safety, notify |
| `create-message-request.ts` | Có | Request + `findOrCreateDirectConversation` → RPC 063 |
| `respond-message-request.ts` | Có | Accept / reject / block |
| `block-user.ts` | Có | Block, archive, mute |
| `report-message.ts` | Có | Report conv hoặc request |
| `message-permissions.ts` | Có | `canUserMessage`, `getMessagingCapability` |
| `get-privacy-settings.ts` | Có | CRUD privacy |
| `message-rate-limit.ts` | Có | Request + duplicate + conv rate |
| `message-safety.ts` | `lib/moderation/` | Keyword filter |
| `get-message-reports.ts` | Có | Admin queue |
| `admin-message-moderation.ts` | Có | Actions + audit |
| `get-message-restriction-message.ts` | Có | Copy hạn chế có ngày |
| `has-account-activity.ts` | Có | Giới hạn account ít hoạt động |
| `create-notification` | `lib/notifications/create-message-notification.ts` | 5 loại DM |

### `lib/actions/messages.ts`

Server actions: gửi tin, start từ profile, accept/reject/block request, báo cáo, privacy, mute, archive.

### Chưa có (đặt tên spec vs thực tế)

| Hàm spec | Thực tế |
|----------|---------|
| `getInbox` | `getInboxConversations` |
| `getConversation` | `getConversationDetail` |
| `sendMessage` | `sendMessage` (lib) + `sendMessageAction` |
| `createConversation` | `findOrCreateDirectConversation` / RPC `create_direct_conversation` |
| `blockUser` | `blockUser` |
| `reportMessage` | `reportMessage` |
| `createNotification` | `createNotification` + wrappers message |

---

## 5. Bảo mật

### Đã có

- RLS **bật** trên tất cả bảng messaging.
- **Đọc** conversation/message: chỉ participant (`is_conversation_participant`).
- **Gửi** message: `sender_id = auth.uid()` + participant.
- **Message requests:** chỉ requester/recipient đọc; recipient update.
- **Blocks:** chỉ đọc block của chính mình.
- **Reports:** insert khi participant hoặc recipient của request (062).
- **Staff:** `user_has_permission(..., 'report.review')` đọc message / reports (moderation).
- **Response app:** chỉ `profiles` (display_name, username, avatar) — **không** select email/coin/wallet trong luồng DM.
- **Lọc nội dung:** `message-safety.ts` + `body_safety_status`; ẩn `review` với người nhận (RLS + app filter).

### Rủi ro đã phát hiện & xử lý

| Mức | Vấn đề | Xử lý |
|-----|--------|--------|
| **Cao** | Policy `Users insert self as participant` cho phép user tự `INSERT` vào **bất kỳ** `conversation_id` nào (đoán UUID) → đọc/gửi tin | **063**: chỉ cho insert khi conversation **chưa có** participant; tạo DM 2 người qua RPC `create_direct_conversation` |
| **Cao** | Insert 2 participant trong một request từ client: row `userB` **vi phạm** RLS khi session là `userA` → tạo hội thoại mới có thể **lỗi im lặng** | Cùng RPC 063 |
| Trung bình | Chặn block ở **app layer**; RLS insert message không gọi `is_message_blocked` | Chấp nhận MVP; có thể harden ở RPC gửi tin sau |
| Trung bình | `message_privacy_settings` SELECT `true` cho mọi authenticated — lộ **cài đặt** (không lộ tin) | Chấp nhận để check quyền nhắn |
| Thấp | Staff policy đọc **mọi** message khi có `report.review` | Đúng thiết kế moderation; không đọc full inbox user |

### Khuyến nghị prompt sau (không làm trong audit)

- RPC `send_message` security definer (block + rate limit + participant).
- Realtime subscription scoped theo `conversation_id`.
- Index composite thêm nếu inbox > 10k rows/user.

---

## 6. Gaps (làm tiếp)

### Đã xong (MVP)

- [x] Inbox + conversation detail
- [x] Message requests
- [x] Privacy settings
- [x] Block / report / admin queue
- [x] Rate limit + safety filter cơ bản
- [x] Notifications DM
- [x] Tích hợp profile + nav

### Chưa làm / cần cải thiện

- [ ] **Realtime** hoặc polling hội thoại (hiện `router.refresh` + unread API 60s)
- [ ] **Group chat** (không có schema)
- [ ] **Ảnh / file**
- [ ] **E2E encryption**
- [ ] Typing indicator, read receipts đầy đủ (chỉ `last_read_at` cơ bản)
- [ ] Tab **Đã lưu trữ** inbox
- [ ] Dedupe notification tin nhắn theo conversation (đã có dedupe window ngắn)
- [ ] Test E2E / integration
- [ ] Gộp UI `allowDm` (profile) vs `/me/settings/messages` (một nơi cấu hình)
- [ ] `warn_user` admin: chưa notification tới user bị cảnh cáo

---

## 7. Thứ tự triển khai đề xuất

1. **Chạy migration 063** (nếu chưa) — bắt buộc trước production traffic.
2. **QA manual** theo checklist acceptance (2 user, request, block, rate limit).
3. **Realtime hoặc polling 15s** trên `ConversationPage` (UX, không đổi schema).
4. **RPC send_message** (harden RLS) nếu cần pentest.
5. Group / attachments chỉ khi product chốt — **bảng mới**, không tái dùng `conversations.type = 'direct'`.

---

## 8. File map nhanh

```
app/messages/
  layout.tsx, page.tsx, [conversationId]/page.tsx
app/me/settings/messages/page.tsx
app/admin/moderation/messages/page.tsx
app/api/messages/unread/route.ts

components/messages/     # 14 files
components/admin/MessageModerationQueue.tsx

lib/messages/            # 15 files
lib/actions/messages.ts
lib/moderation/message-safety.ts
lib/notifications/create-message-notification.ts
types/messages.ts

supabase/migrations/
  061_messages_system.sql
  062_message_reports_requests.sql
  063_messages_participant_rls_fix.sql
```

---

## 9. Validation

```bash
npx tsc --noEmit
npm run lint   # nếu có
npx supabase db push   # áp 063
```

Manual: login 2 user → `/messages` → profile → nhắn tin → request → accept → gửi tin → block → admin report.
