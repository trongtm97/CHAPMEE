# Content Origin Validation Report (Prompt 7)

Date: 2026-06-02

## Scope

- Backfill safety script for `content_origin`.
- Demo/local seed coverage for original + translation states.
- Policy validation script for monetization safety.
- Guard-path audit for unlock/tip/ads-revenue related flows.
- UI validation checklist and legal-claim safety.

## Command Results

1. `git status --short`
   - Repo is heavily dirty (pre-existing large worktree); Prompt 7 changes were applied without reverting unrelated changes.
2. `pnpm tsx scripts/backfill-content-origin.ts --dry-run`
   - Failed because `pnpm` is not installed on this machine.
3. Fallback: `npx --yes tsx scripts/backfill-content-origin.ts --dry-run`
   - Output:
     - updated original: 0
     - updated translation: 0
     - skipped: 0
     - errors: 0
   - Notes: no stories with missing `content_origin` in current dataset.
4. `npx --yes tsx scripts/validate-content-origin-policy.ts`
   - Result: 7/7 PASS.
5. `npm run build`
   - Result: PASS (Next.js build + TypeScript + static generation completed).

## Backfill Script

- File: `scripts/backfill-content-origin.ts`
- Behavior:
  - Finds stories where `content_origin` is missing/blank.
  - Detects translation candidates by title/slug/source metadata hints.
  - Defaults to `original` when no translation signal.
  - Does not overwrite stories that already have `content_origin`.
  - Dry-run by default.
  - Requires `--apply` to write.
  - Prints summary: updated original / updated translation / skipped / errors.

## Demo Seed Coverage

- Updated file: `scripts/db-seed-local.ts`
- Added `seedDemoContentOriginSamples()`:
  - Local DB safeguard (only runs for localhost-style DB URLs).
  - Ensures seeded local dataset contains:
    - 3 demo original stories.
    - 3 demo translation stories with source metadata.
  - Translation states mapped:
    - unverified + free_only
    - verified + ads_tips_allowed
    - rejected + no_monetization
  - Uses fictional placeholder source fields (`example.local`, demo labels), no copyrighted real content.

## Policy Validation Script

- File: `scripts/validate-content-origin-policy.ts`
- Assertions covered:
  - original can sell if policy full
  - translation unverified cannot sell chapters
  - translation unverified cannot sell bundle
  - translation verified still cannot sell chapters/bundle
  - translation verified can ads/tips only when policy is `ads_tips_allowed`
  - translation rejected cannot ads/tips
  - reasonCodes are emitted by policy engine

## Guard Path Audit (unlock / bundle / tip / ads revenue / monetization)

- `lib/monetization/paid-chapters.ts`: guarded by `loadStoryOriginPolicy()` (`canSellChapters`, `canUseCoinUnlock`).
- `lib/monetization/unlock-story-full-access.ts`: guarded by `loadStoryOriginPolicy()` (`canSellStoryBundle`, `canUseCoinUnlock`).
- `lib/monetization/early-access.ts`: guarded by `loadStoryOriginPolicy()` (`canUseCoinUnlock`).
- `lib/monetization/tips.ts`: guarded by `loadStoryOriginPolicy()` (`canReceiveTips`) at story/chapter path.
- `lib/creator-ad-revenue/eligibility.ts`:
  - Existing explicit TODO kept:
    - `TODO(content-origin): enforce translation rights policy at story-level for ad revenue share`.

Status: key monetization entry paths are guarded; remaining ad-revenue story-level enforcement remains explicitly tracked by TODO.

## UI Validation Checklist

- Studio create original: PASS (origin selection available).
- Studio create translation: PASS (translation metadata flow available).
- Admin verify rights: PASS (translation admin pages/actions available).
- Story detail original: PASS (origin badge/normal monetization behavior).
- Story detail translation: PASS (free-read behavior + translation metadata panel).
- Reels badge: PASS (origin badge shown).
- Discover sections: PASS (origin-separated sections + badges).
- Desktop nav: PASS (`/truyen-sang-tac`, `/truyen-dich` links present).
- Mobile bottom nav unchanged: PASS (4-tab behavior preserved from prior implementation).

## Legal Claim Safety

Checked labels:
- `Dịch có phép` is rendered only when `rights_status === verified`.
- Non-verified translation labels remain neutral (`Dịch · Miễn phí`).
- No blanket “bản quyền đầy đủ” claims were introduced in Prompt 7 updates.

## Files Changed For Prompt 7

- `scripts/backfill-content-origin.ts` (new)
- `scripts/validate-content-origin-policy.ts` (new)
- `scripts/db-seed-local.ts` (updated)
- `package.json` (updated scripts)
- `docs/CONTENT_ORIGIN_VALIDATION_REPORT.md` (new)

## Acceptance Mapping (Prompt 7)

1. Backfill script exists and dry-run default: PASS
2. Validation script exists: PASS
3. Demo data has original/translation examples: PASS
4. Policy validation passes: PASS
5. Translation cannot sell chapters/bundle in tests: PASS
6. Verified translation can only ads/tips when policy allows: PASS
7. `CONTENT_ORIGIN_VALIDATION_REPORT.md` exists: PASS
8. Build pass: PASS
9. No Supabase dependency added: PASS
