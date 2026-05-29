# RBAC matrix test report

- Started: 2026-05-29T07:22:39.610Z
- Total: 13 | PASS: 1 | FAIL: 0 | SKIP: 12

## Summary

All automated checks passed (or skipped).

## Results

| Section | Check | Status | Detail |
|---------|-------|--------|--------|
| guest | comment insert denied | PASS | new row violates row-level security policy for table "comments" |
| reader | sign-in test_reader@chapchap.test | SKIP | Invalid login credentials |
| creator | sign-in test_creator@chapchap.test | SKIP | Invalid login credentials |
| verified_creator | sign-in test_verified_creator@chapchap.test | SKIP | Invalid login credentials |
| moderator | sign-in test_moderator@chapchap.test | SKIP | Invalid login credentials |
| content_admin | sign-in test_content_admin@chapchap.test | SKIP | Invalid login credentials |
| finance_admin | sign-in test_finance_admin@chapchap.test | SKIP | Invalid login credentials |
| support_admin | sign-in test_support_admin@chapchap.test | SKIP | Invalid login credentials |
| admin | sign-in test_admin@chapchap.test | SKIP | Invalid login credentials |
| super_admin | sign-in test_super_admin@chapchap.test | SKIP | Invalid login credentials |
| owner | sign-in test_owner@chapchap.test | SKIP | Invalid login credentials |
| banned_user | sign-in test_banned@chapchap.test | SKIP | Invalid login credentials |
| rls | reader cannot read owner wallet | SKIP | missing users |

## Manual follow-up

See `scripts/rbac-role-matrix-checklist.md` for route/UI/server-action checks.
