# ChapMee — Caddy production guide

Config file: **`Caddyfile.production`** (mounted as `/etc/caddy/Caddyfile` in the `caddy` service).

Only **ports 80 and 443** are published on the VPS. MinIO API (`9000`) and console (`9001`) stay on the internal Docker network.

---

## 1. What Caddy does

| Host | Backend | Notes |
|------|---------|--------|
| `chapmee.com` | `web:3000` | Next.js app + safe response headers |
| `chapmee.com` `/api/postgrest/*` | `postgrest:3000` | Legacy browser API (prefix stripped) |
| `www.chapmee.com` | — | Permanent redirect → `https://chapmee.com` |
| `media.chapmee.com` | `minio:9000` | Public **read** for bucket objects only |

**Not proxied:** MinIO console on port **9001** (never add a public site block for it).

---

## 2. DNS records

Point all hosts to the VPS public IP (A or AAAA):

| Name | Type | Target |
|------|------|--------|
| `chapmee.com` | A / AAAA | VPS IP |
| `www.chapmee.com` | A / AAAA or CNAME → `chapmee.com` | VPS IP |
| `media.chapmee.com` | A / AAAA | VPS IP |

Wait for propagation before expecting Let's Encrypt certificates to issue.

---

## 3. Media domain (`media.chapmee.com`)

### How URLs work

- **Browser / HTML** uses `S3_MEDIA_PUBLIC_BASE_URL=https://media.chapmee.com` (virtual-host style via custom domain on Vietnix S3 — NO bucket name in path).
- **App upload / presign** uses internal `S3_ENDPOINT=https://s3.vn-hcm-1.vietnix.cloud` — reachable from the app container with credentials.
- **Database** stores `media_asset_id` / object keys — not full public URLs.

Example object URL:

```text
https://media.chapmee.com/story-images/<id>/cover.webp
```

### Bucket policy

Public read on `chapmee-media` bucket is configured in the Vietnix S3 panel (toggle "public" or attach the public-read policy). The text bucket `chapmee-text` is private.

### Expected HTTP behaviour

| Request | Typical response |
|---------|------------------|
| `GET https://media.chapmee.com/` (bucket root) | **403** — normal (no public listing) |
| `GET https://media.chapmee.com/<valid-key>` | **200** + object bytes |

---

## 4. Security headers (app only)

On `chapmee.com` only:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: SAMEORIGIN`

**No CSP** in Caddy — adding CSP here can break ads, third-party media, or PostgREST clients.

`media.chapmee.com` does not set `X-Frame-Options` so objects can be embedded where the product allows.

---

## 5. Deploy / reload

After editing `Caddyfile.production`:

```bash
# Validate config inside running container
docker compose -f docker-compose.production.yml exec caddy caddy validate --config /etc/caddy/Caddyfile

# Reload without full stack restart
docker compose -f docker-compose.production.yml exec caddy caddy reload --config /etc/caddy/Caddyfile

# Or recreate caddy only
docker compose -f docker-compose.production.yml up -d caddy
```

First deploy (from app directory):

```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d caddy web minio postgrest
```

---

## 6. Logs

```bash
docker compose -f docker-compose.production.yml logs -f caddy
```

Inside container:

```bash
docker compose -f docker-compose.production.yml exec caddy caddy list-modules
```

Certificate issues often appear in caddy logs (ACME, DNS, firewall).

---

## 7. Testing

### App

```bash
curl -sI https://chapmee.com | head -5
# Expect 200/301/302 and HTTPS
```

Browser: open `https://chapmee.com`, login, studio upload (presign → internal MinIO).

### PostgREST (browser path)

```bash
curl -sI "https://chapmee.com/api/postgrest/" | head -5
# Expect response from PostgREST (not Next 404)
```

Requires `NEXT_PUBLIC_POSTGREST_URL=https://chapmee.com/api/postgrest` in `.env.production`.

### Media object

Replace with a real object key from DB / Vietnix S3:

```bash
curl -sI "https://media.chapmee.com/<object-key>"
# Expect HTTP/2 200 for existing public object
```

```bash
curl -sI "https://media.chapmee.com/"
# Often 403 — OK
```

### www redirect

```bash
curl -sI "https://www.chapmee.com/" | grep -i location
# Location: https://chapmee.com/
```

---

## 8. Common errors

| Symptom | Likely cause |
|---------|----------------|
| Certificate stuck / HTTP only | DNS not pointing to VPS; port 80 blocked; wait for ACME |
| `502` on chapmee.com | `web` container down — `docker compose ps web` |
| `502` on /api/postgrest | `postgrest` down or wrong strip_prefix |
| Media 404 | Wrong object key or bucket name mismatch (`S3_BUCKET` vs URL path) |
| Media 403 on valid key | Bucket not public-read — re-run `minio-init` or fix policy |
| Media 403 on `/` only | Expected — root is not a public listing |
| Console exposed | **Misconfiguration** — never publish `9001` or add Caddy site for console |
| Broken embeds on app | `X-Frame-Options: SAMEORIGIN` — remove snippet if product needs iframe embed |
| Upload works, images broken | `S3_MEDIA_PUBLIC_BASE_URL` must match `https://media.chapmee.com` (no bucket path) |

---

## 9. Files

| File | Role |
|------|------|
| `Caddyfile.production` | Committed production config |
| `docker-compose.production.yml` | Mounts `./Caddyfile.production` → `/etc/caddy/Caddyfile` |
| `deploy/Caddyfile` | Deprecated pointer — do not edit for production |

---

## 10. Related

- `docs/DOCKER_COMPOSE_PRODUCTION_GUIDE.md` — full stack
- `docs/PRODUCTION_ENV_GUIDE.md` — `S3_PUBLIC_BASE_URL`, PostgREST URLs
- `.env.production.example` — env template
