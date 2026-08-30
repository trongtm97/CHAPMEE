# Content Protection (Anti-crawl) — Implementation Plan

**Parent:** [READER_ENGAGEMENT_ARCHITECTURE.md](./READER_ENGAGEMENT_ARCHITECTURE.md)  
**Status:** MVP implemented (`drizzle/0019_crawl_protection.sql`)  
**Priority:** Phase 5

---

## What can and cannot be protected

| Scenario | Protection |
|----------|------------|
| Public free chapter in HTML | Readable by anyone including scrapers — **mitigate frequency**, not secrecy |
| Paid / early-access / draft | **No full body** in HTML or API before entitlement; S3 not fetched |
| Direct API abuse | Rate limits + `security_events` + optional Turnstile |
| Google SEO | **Same content** for users and allowed bots — **no cloaking** |

We do **not** promise DRM or 100% anti-scrape for public content.

---

## Architecture (MVP)

1. **`crawl_protection_settings`** (singleton) — admin-configurable limits  
2. **`security_events`** — audit log (`rate_limit_hit`, `suspicious_reader_velocity`, `challenge_*`, `content_access_denied`, …)  
3. **`lib/security/rate-limit.ts`** — `checkRateLimit`, chapter/search scoped helpers  
4. **In-memory store** (`lib/security/rate-limit-store.ts`) — local dev; **production: Redis or edge WAF**  
5. **`getChapterForReader`** — permission + rate limit **before** `getChapterFullContent` / S3  
6. **`GET /api/reader/chapter-content`** — same guards for programmatic access  
7. **Turnstile** — optional via `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; disabled when keys absent  
8. **Admin** — `/admin/security/crawl-protection`

---

## Public vs logged-in vs paid

```text
Episode page
  → getEpisodeReaderData (metadata, preview if S3)
  → paid/early-access gates
  → hydrateEpisodeReaderBody (only if unlocked)
       → getChapterForReader(allowFullBody: true)
            → guardChapterRead (rate + velocity)
            → getChapterFullContent(allowS3Fetch: true)
```

`getChapterFullContent({ allowS3Fetch: false })` returns **preview only** for all storage types (including DB inline), fixing paid-content leaks.

---

## Rate limits (defaults)

Configured in DB; not hard-coded in business logic.

| Scope | Default |
|-------|---------|
| Anonymous chapter reads | 20/min, 200/hour |
| Logged-in chapter reads | 60/min, 600/hour |
| Search | 30/min |
| Comments / reactions | 10–30/min |
| Reviews | 10/hour |

Existing write-path limits (`lib/rate-limit.ts` → `rate_limit_events`) remain for authenticated actions.

---

## Challenge strategy

- `challenge_enabled` default **false**  
- Only for suspicious velocity or rate-limit + challenge flag  
- **Not** shown to every reader  
- Good bots (Googlebot, bingbot, …) allowlisted — same HTML as users  

---

## SEO compatibility

- `lib/seo/robots-config.ts` — public story/chapter paths **allowed**  
- Private areas (`/studio`, `/me`, `/api`, …) **disallowed** — not relied on for auth  
- Search result pages: `noindex` where appropriate  
- **No cloaking** — never different chapter text for Googlebot vs user  

---

## Production recommendations

1. **Redis** (or Upstash) for distributed rate limits — replace in-memory store  
2. **Cloudflare** (or similar) WAF, bot fight mode, rate limiting at edge  
3. Monitor `security_events` + alert on spikes  
4. Presigned S3 URLs remain server-only; never expose object keys for locked chapters  

---

## Files

| Path | Role |
|------|------|
| `drizzle/0019_crawl_protection.sql` | Schema |
| `lib/security/*` | Rate limit, events, settings, challenge, guards |
| `lib/chapters/get-chapter-for-reader.ts` | Reader content guard |
| `app/api/reader/chapter-content/route.ts` | Protected API |
| `components/security/SecurityChallenge.tsx` | Turnstile UI hook |
| `app/admin/security/crawl-protection/page.tsx` | Admin |

---

## Rules (non-negotiable)

- No cloaking  
- No text-as-image chapters  
- No fake content for bots  
- No blocking all bots blindly  
- robots.txt is **not** access control for paid content  
