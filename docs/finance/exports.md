# ChapMee Finance Exports (MVP)

## Mục tiêu

Tài liệu này mô tả các loại export tài chính dạng CSV trong ChapMee để phục vụ admin/finance review nội bộ.

Lưu ý: đây **không phải** hệ thống hóa đơn điện tử chính thức.

## Route và quyền truy cập

- Admin page: `/admin/finance/exports`
- API export: `/api/admin/finance/export`
- Chỉ `admin` hoặc `founder` được export toàn hệ thống.
- Creator có thể tải statement của chính mình qua `/api/creator/finance/statement`.

## Các loại export hỗ trợ

- `transactions`
- `coin_purchases`
- `creator_revenue`
- `payouts`
- `refunds`
- `chargebacks`
- `supporter_transactions`
- `vip_subscriptions`
- `fan_club_memberships`
- `sponsored_campaign_revenue`

## Filters hỗ trợ

- `from` / `to` (ISO datetime)
- `type`
- `status`
- `userId`
- `creatorUserId`
- `source`
- `currency`

## Cột CSV chính

### Transactions

- `transaction_code`
- `created_at`
- `type`
- `source`
- `status`
- `user_id`
- `creator_user_id`
- `story_id`
- `chapter_id`
- `coin_amount`
- `paid_coin_amount`
- `bonus_coin_amount`
- `money_amount_vnd`
- `platform_fee_vnd`
- `creator_gross_vnd`
- `creator_net_vnd`
- `currency`

### Payouts

- `payout_request_id`
- `creator_user_id`
- `amount_vnd`
- `method`
- `status`
- `requested_at`
- `completed_at`
- `transaction_code`

### Refunds

- `refund_id`
- `original_transaction_id`
- `user_id`
- `amount_vnd`
- `coin_amount`
- `status`
- `reason`
- `processed_at`

## Invoice/receipt placeholder

MVP có bảng `invoices` để chuẩn bị dữ liệu invoice/receipt nội bộ:

- `invoice_number` (unique)
- `invoice_type`: `purchase` / `payout` / `sponsor` / `refund`
- `status`: `draft` / `issued` / `cancelled`
- `transaction_id`, `amount_vnd`, metadata liên quan

Chưa tích hợp provider e-invoice chính thức.

## Lưu ý vận hành

- CSV được generate server-side.
- Không export provider secret hoặc dữ liệu nhạy cảm không cần thiết.
- Dữ liệu dùng cho đối soát nội bộ, cần kế toán/đơn vị pháp lý kiểm tra trước khi dùng kê khai thuế chính thức.
