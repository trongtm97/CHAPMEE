# Media lifecycle cleanup (TODO)

MVP registers uploads in `media_assets` with `status` and `expires_at` for `temp/` uploads.

Planned cron/job:

1. Mark `uploading` older than 24h as `orphan_detected`.
2. Delete `temp/` objects past `expires_at` from S3 and set `deleted`.
3. Reconcile `storage_assets` (legacy) with `media_assets` before dropping legacy table.

Run manually during development:

```bash
# TODO: implement scripts/media-cleanup.mjs
```
