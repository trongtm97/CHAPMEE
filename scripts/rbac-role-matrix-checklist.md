# Ma trận kiểm thử phân quyền ChapMee

Tài liệu checklist thủ công + tự động cho RBAC/RLS. Không dùng trên production.

## Chuẩn bị

```bash
# 1. Database (local)
npm run db:migrate && npm run db:legacy

# 2. Test users (cần DATABASE_URL + BETTER_AUTH_SECRET + POSTGREST_JWT_SECRET)
npm run test:rbac:setup

# 3. Automated RPC/RLS
npm run test:rbac
```

**Mật khẩu mặc định:** `ChapChapTest!2026` (đổi bằng `--password` hoặc `RBAC_TEST_PASSWORD`).

| Account | Email |
|---------|-------|
| reader | test_reader@chapchap.test |
| creator | test_creator@chapchap.test |
| verified_creator | test_verified_creator@chapchap.test |
| moderator | test_moderator@chapchap.test |
| content_admin | test_content_admin@chapchap.test |
| finance_admin | test_finance_admin@chapchap.test |
| support_admin | test_support_admin@chapchap.test |
| admin | test_admin@chapchap.test |
| super_admin | test_super_admin@chapchap.test |
| owner | test_owner@chapchap.test |
| banned | test_banned@chapchap.test |

---

## 1. Guest (không đăng nhập)

| # | Kiểm tra | Cách | Kỳ vọng |
|---|----------|------|---------|
| G1 | Landing / truyện public | Mở `/`, `/truyen/[slug]` published | OK |
| G2 | Comment | POST comment API / action | Từ chối / login |
| G3 | Save / follow | Server action | Từ chối |
| G4 | Studio | `/creator` | Redirect login |
| G5 | Admin | `/admin` | Redirect |
| G6 | Wallet | `/wallet` | Redirect |

---

## 2. Reader (`test_reader`)

| # | Được | Không được |
|---|------|------------|
| R1 | Đọc truyện public, comment, save, follow | — |
| R2 | `/wallet` ví của mình | Ví user khác (RLS) |
| R3 | Nạp coin (nếu test mode bật) | — |
| R4 | — | `/creator` tạo truyện |
| R5 | — | `/admin`, `/admin/finance` |
| R6 | — | Moderation, assign role |

**Server actions:** `createComment`, `saveStory`, `followStory` → OK. `createStory` → denied.

---

## 3. Creator (`test_creator`)

| # | Được | Không được |
|---|------|------------|
| C1 | Studio, tạo/sửa story own | Sửa story người khác |
| C2 | Chapter own | Approve story |
| C3 | Stats own | Finance, assign role |
| C4 | Request payout (nếu monetization + KYC OK) | Approve payout |

---

## 4. Verified creator (`test_verified_creator`)

| # | Được | Không được |
|---|------|------------|
| V1 | Creator + `chapter.set_vip` | Approve payout |
| V2 | Monetization / payout request | Finance admin routes |

---

## 5. Moderator (`test_moderator`)

| # | Được | Không được |
|---|------|------------|
| M1 | `/admin/reports`, moderate comment/community | `/admin/finance` |
| M2 | Ban user (nếu UI có) | Wallet adjust, payout |
| M3 | — | Assign role, app settings |

---

## 6. Content admin (`test_content_admin`)

| # | Được | Không được |
|---|------|------------|
| CA1 | Approve/reject story, moderate content | Wallet / payout |
| CA2 | Feature story (nếu có) | Assign owner/super_admin |

---

## 7. Finance admin (`test_finance_admin`)

| # | Được | Không được |
|---|------|------------|
| F1 | `/admin/finance`, transactions, payouts | Moderate comment (nếu không có quyền) |
| F2 | Approve/reject payout, refund, adjust | Sửa story (nếu không có story.*) |
| F3 | — | Assign owner |

---

## 8. Support admin (`test_support_admin`)

| # | Được | Không được |
|---|------|------------|
| S1 | Feedback, user basic (`admin.user.view`) | Wallet, payout |
| S2 | — | Gán role cao |

---

## 9. Admin (`test_admin`)

| # | Được | Không được |
|---|------|------------|
| A1 | Admin dashboard, users, settings, audit | Finance wallet (trừ khi gán thêm) |
| A2 | — | `admin.user.role.assign`, owner |

---

## 10. Super admin (`test_super_admin`)

| # | Được | Không được |
|---|------|------------|
| SA1 | Assign role (trừ owner), audit, settings | Gán owner |
| SA2 | Xem finance dashboard (seed) | `finance.wallet.adjust` (seed không có) |

---

## 11. Owner (`test_owner`)

| # | Kỳ vọng |
|---|---------|
| O1 | Toàn quyền permission DB |
| O2 | Gán/revoke super_admin |
| O3 | Audit log đầy đủ |

---

## 12. Banned (`test_banned`)

| # | Kỳ vọng |
|---|---------|
| B1 | Login được (nếu app cho phép) |
| B2 | `is_user_write_blocked` = true |
| B3 | Comment, post, story create, payout → chặn |
| B4 | Thông báo khóa trên UI (nếu có) |

---

## 13. RLS (SQL hoặc script)

| # | Probe | Kỳ vọng |
|---|-------|---------|
| L1 | User A `select` wallet user B | Empty / denied |
| L2 | User A `update` balance | Denied |
| L3 | User A `insert` user_roles admin | Denied |
| L4 | Reader `select` admin_audit_logs | Denied |
| L5 | Creator `update` payout → approved | Denied |

*Automated trong `npm run test:rbac`.*

---

## 14. Route protection (middleware)

| Route | moderator | finance_admin | reader |
|-------|-----------|---------------|--------|
| `/admin` | OK | OK | Denied |
| `/admin/finance` | Denied | OK | Denied |
| `/admin/payouts` | Denied | OK | Denied |
| `/admin/users` | Denied* | Denied* | Denied |

\*Trừ khi có `admin.user.view`.

---

## 15. Ghi nhận kết quả

Sau khi chạy:

1. `scripts/rbac-test-report.md` — kết quả tự động
2. Điền bảng pass/fail thủ công vào issue/Notion
3. Lỗi → sửa migration/server guard → chạy lại `npm run test:rbac`

## Lưu ý sản phẩm (app layer)

`getAuthContextForUser` luôn merge `READER_PERMISSIONS` cho user đã đăng nhập. RLS và `user_has_permission` **không** merge — đó là nguồn truth cho DB. Nếu cần tách moderator khỏi reader wallet UI, cần quyết định sản phẩm riêng.
