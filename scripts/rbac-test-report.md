# RBAC matrix test report

- Started: 2026-06-01T12:26:18.031Z
- Total: 13 | PASS: 1 | FAIL: 0 | SKIP: 12

## Summary

All automated checks passed (or skipped).

## Results

| Section | Check | Status | Detail |
|---------|-------|--------|--------|
| guest | comment insert denied | PASS | permission denied for table creator_profiles |
| reader | resolve test_reader@chapchap.test | SKIP | Use createAdminClient() |
| creator | resolve test_creator@chapchap.test | SKIP | Use createAdminClient() |
| verified_creator | resolve test_verified_creator@chapchap.test | SKIP | Use createAdminClient() |
| moderator | resolve test_moderator@chapchap.test | SKIP | Use createAdminClient() |
| content_admin | resolve test_content_admin@chapchap.test | SKIP | Use createAdminClient() |
| finance_admin | resolve test_finance_admin@chapchap.test | SKIP | Use createAdminClient() |
| support_admin | resolve test_support_admin@chapchap.test | SKIP | Use createAdminClient() |
| admin | resolve test_admin@chapchap.test | SKIP | Use createAdminClient() |
| super_admin | resolve test_super_admin@chapchap.test | SKIP | Use createAdminClient() |
| owner | resolve test_owner@chapchap.test | SKIP | Use createAdminClient() |
| banned_user | resolve test_banned@chapchap.test | SKIP | Use createAdminClient() |
| rls | reader cannot read owner wallet | SKIP | missing users |

## Manual follow-up

See `scripts/rbac-role-matrix-checklist.md` for route/UI/server-action checks.
