# Finance hardening — manual validation

Apply migrations `052`–`057` (`supabase db push`) before testing.

## Prerequisites

| Account | Role / permissions |
|---------|-------------------|
| Reader | `reader` |
| Creator | `creator` (+ own revenue) |
| Finance admin | `finance_admin` |
| Moderator | `moderator` (no finance perms) |

## Checks

| # | Step | Expected |
|---|------|----------|
| 1 | Reader → `/wallet` | Own balance visible |
| 2 | Reader query another user's `user_wallets` (client/API) | Blocked by RLS |
| 3 | Reader `update` on `user_wallets.balance` | RLS / no policy |
| 4 | Reader buy VIP chapter | `transactions` row + balance via ledger RPC |
| 5 | Reader tip creator | Reader debit + creator revenue transaction |
| 6 | Creator request payout (min balance) | `payout_requests.status = pending` |
| 7 | Creator approve own payout (API/action) | Forbidden |
| 8 | Finance admin approve payout | Status → approved/processing; audit log |
| 9 | Finance admin reject payout (no reason) | Error — reason required |
| 10 | Finance admin reject with reason | Status rejected; audit log |
| 11 | Moderator → `/admin/finance` | Middleware `finance_forbidden` |
| 12 | Finance admin process refund | Coin debit via `apply_user_coin_ledger`; `refund_processed` audit |
| 13 | Creator statement API for other creator | `403` without `finance.payout.view` |
| 14 | Creator statement own | `200` with `creator.revenue.view.own` |
| 15 | Creator INSERT payout with `status=approved` via PostgREST | RLS denied (only `requested`/`under_review`) |
| 16 | Payout auto-approve (manual_review=false) | RPC `maybe_auto_approve_own_payout_request` → `approved` |
| 17 | Moderator on admin dashboard | No finance / bonus / risk links visible |
| 18 | Manual refund without reason | Server error "Vui lòng nhập lý do refund." |

## Audit log

Admin → `/admin/audit` — filter actions:

- `wallet_adjustment`
- `refund_processed`
- `payout_approved` / `payout_rejected` / `payout_paid`

Metadata should include `amount`, `user_id`, `payout_id`, `old_status`, `new_status`, `reason` where applicable.
