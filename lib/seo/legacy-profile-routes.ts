/**
 * Legacy public profile URL patterns — canonical profile is `/@username`.
 *
 * Already handled in app routes / next.config:
 * - `/author/:id` → resolves username → `/@username` (see app/author/[id]/page.tsx)
 * - `/creators/:creatorId` → `/@username` (see app/creators/[creatorId]/page.tsx)
 * - `/tac-gia/:username` → `/@username` (see app/tac-gia/[username]/page.tsx)
 * - `/profile/:username` → `/@username` (next.config redirects)
 * - `/u/:username` → `/@username` (next.config redirects)
 * - `/community/author/:creatorProfileId` → `/@username?tab=community` (see app/community/author/[authorId]/page.tsx)
 *
 * `/creator/*` is the creator **workspace** (drafts, stories editor), not legacy public profile.
 * Workspace paths redirect to `/studio/*` via next.config — do not treat as profile slug redirects.
 *
 * TODO: If legacy `/creator/:userId` public profile URLs existed in production analytics,
 * add seo_redirects rows or id→username resolver once historical mapping is confirmed.
 * Do not invent fake username mappings from opaque ids.
 */

export const LEGACY_PROFILE_ROUTE_PREFIXES = [
  "/author",
  "/creators",
  "/tac-gia",
  "/profile",
  "/u"
] as const;
