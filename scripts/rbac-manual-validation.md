# RBAC / RLS manual validation checklist

Run after applying migrations `052`–`057` (`supabase db push`).

**Automated matrix:** `npm run test:rbac:setup` then `npm run test:rbac` — see `scripts/rbac-role-matrix-checklist.md`.

## Prerequisites

- Three test accounts: `reader`, `creator`, `moderator`, `finance_admin`, `admin` (or assign roles via `/admin/users`).
- Supabase SQL editor or `psql` for RLS probes.

## 1. Role assignment

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | As reader, `insert into user_roles (user_id, role_id) ...` for `admin` | RLS denied |
| 1.2 | As admin without `admin.user.role.assign`, assign role via client | Denied |
| 1.3 | As owner/super_admin with assign permission, assign `moderator` | Success + audit log |

## 2. Wallets

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | User A `select * from user_wallets where user_id = User B` | Empty / denied |
| 2.2 | User A `update user_wallets set paid_coin_balance = 999` | Denied |
| 2.3 | User A call `apply_user_coin_ledger` credit `admin_coin_adjustment` | RPC `Forbidden credit` |
| 2.4 | Finance staff adjust via admin action | Success |

## 3. Creator ownership

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | Creator A `update stories set title = 'x' where id` owned by B | 0 rows / denied |
| 3.2 | Creator A update own draft story | Success |
| 3.3 | Server action `updateStory` for other's id | `notFound` / ownership error |

## 4. Finance vs moderation

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Moderator open `/admin/finance` | Middleware redirect `finance_forbidden` |
| 4.2 | Moderator `update payout_requests set status = 'approved'` | RLS denied |
| 4.3 | Finance admin approve payout (with permission) | Success |
| 4.4 | Finance admin `pinComment` / moderate story without `story.moderate` | Server 403 |

## 5. Audit logs

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Reader `select * from admin_audit_logs` | Denied |
| 5.2 | Admin with `admin.audit.view` | Success |

## 6. Public read

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | Anonymous read published story + episodes | Success |
| 6.2 | Anonymous read visible comments on public story | Success |

## 7. Client bundle secrets

```bash
rg "SERVICE_ROLE|service_role" --glob "!node_modules/**" .
```

Expected: no service role key in `app/`, `components/`, or `NEXT_PUBLIC_*` env usage.

## 8. Server actions spot-check

- `followStory`, `createComment`, `createCheckout` without login → redirect / error VN.
- Banned user → write actions return ban message.
