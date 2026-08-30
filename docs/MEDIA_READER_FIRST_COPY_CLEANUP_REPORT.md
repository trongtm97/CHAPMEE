# Media Reader-First Copy Cleanup Report

Date: 2026-06-03  
Scope: Public `/media` — reader-facing copy, filters, empty state, policy note visibility.

## Summary

`/media` was refactored from a mixed creator/admin tone to a **reader-first** Media Hub. Internal terminology, Studio CTAs, and public YouTube policy notes were removed from the public page. Policy guidance was moved to Studio media forms.

## Text removed from public `/media`

| Removed | Where it was |
|--------|----------------|
| External audio | Filter chip |
| YouTube audio | Filter chip |
| Có nguồn hợp lệ | Filter chip |
| Có link nguồn ChapMee | Filter chip |
| Có nghe liên tục (admin tone) | Replaced with “Nghe liên tục” |
| Thêm media trong Studio | Empty state CTA |
| Chưa có media phù hợp (generic) | Empty state title |
| Audio và video sẽ xuất hiện khi tác giả liên kết... | Empty state (creator-focused) |
| Lưu ý: Audio/Video YouTube cần đặt link nguồn ChapMee... | `MediaSourcePolicyNote` on public page |
| Nghe audio truyện / Xem video chuyển thể (long CTAs) | Hero — shortened |
| Truyện có media | Stats label |
| Nghe/Xem nhiều (combined) | Sort — split by tab |
| Theo truyện mới cập nhật | Sort — renamed |
| Thể loại (slug) | Genre field label |
| External Audio | Card badge |

## Text replaced

| Before | After |
|--------|--------|
| Hero subtitle (đã đăng trên ChapMee) | Nghe audio truyện và xem video chuyển thể từ các **tác phẩm** trên ChapMee. |
| CTA Nghe audio truyện | **Nghe audio** |
| CTA Xem video chuyển thể | **Xem video** |
| Stats: Audio / Video / Truyện có media | Audio truyện / Video chuyển thể / **Tác phẩm** |
| Sort Nghe/Xem nhiều | **Nghe nhiều** (audio) / **Xem nhiều** (video) |
| Sort Theo truyện mới cập nhật | **Truyện vừa cập nhật** |
| Filter Có nghe liên tục | **Nghe liên tục** |
| Card badge External Audio | **Nguồn ngoài** (small, non-primary) |
| Metadata description | …từ các **tác phẩm** trên ChapMee. |

## Tab copy

- **Audio:** “Nghe truyện theo cách nhẹ nhàng hơn.”
- **Video:** “Xem video chuyển thể, trailer hoặc nội dung mở rộng từ truyện.”

## Empty state (reader-first)

### Audio (no filters)

- Title: Chưa có audio truyện phù hợp
- Description: Bạn có thể khám phá truyện đang cập nhật trong lúc audio mới được bổ sung.
- CTA: Khám phá truyện · Xem truyện mới cập nhật

### Video (no filters)

- Title: Chưa có video chuyển thể phù hợp
- Description: Video chuyển thể sẽ xuất hiện khi có nội dung phù hợp từ các truyện trên ChapMee.
- CTA: Khám phá truyện · Xem truyện nổi bật

### With active filters

- Description: Hãy thử xóa bớt bộ lọc hoặc đổi từ khóa tìm kiếm.
- CTA: Khám phá truyện · Xóa bộ lọc

## Policy note moved/hidden

| Location | Status |
|----------|--------|
| Public `/media` | **Hidden** — `MediaSourcePolicyNote` defaults `audience="public"` → renders nothing |
| Studio audio (YouTube form) | **Shown** — `audience="creator"` tab `audio` |
| Studio films (`FilmAdaptationForm`) | **Shown** — `audience="creator"` tab `video` |
| Admin media policy page | **TODO** — reuse same component on admin policy UI if desired |

## Filter labels (public)

**Audio:** Tất cả audio · Nghe liên tục · Mới cập nhật · Truyện sáng tác · Truyện dịch · Đang ra · Hoàn thành · Thể loại (advanced)

**Video:** Tất cả video · Video chuyển thể · Mới cập nhật · + common origin/status chips

Technical filters (`source`, `source_ok`, `chapmee_source`, `youtube`) remain supported via URL for bookmarks but **no longer appear** in the public UI.

## CTA audit (public `/media`)

Allowed: Nghe ngay · Xem video · Đọc truyện · Khám phá truyện · Xem truyện mới cập nhật / nổi bật · Xóa bộ lọc · Tìm

Removed: Thêm media trong Studio · Quản lý media · Kiểm tra nguồn

## SEO heading audit

- Single **h1** “Media” in `MediaHero`
- Tab labels are not headings
- Empty state uses **h2**
- Card titles use **h3**
- Metadata title/description updated per spec

## Mobile bottom nav

Unchanged in this pass — still configured as: Reels → Media → Khám phá → Cộng đồng → Tôi (`MOBILE_BOTTOM_NAV` in `lib/navigation/nav-items.ts`).

## Layout polish

- Hero: flatter, less vertical space
- Page gap: `gap-3` / `gap-4` (was `gap-5` / `gap-6`)
- Filter card: compact padding, horizontal chip scroll
- Empty state: reduced min-height (`11rem` / `13rem`)

## Build result

```
npm run build — PASS
```

## Files changed

- `app/media/page.tsx`
- `components/media/MediaHero.tsx`
- `components/media/MediaTabs.tsx`
- `components/media/MediaHubFilters.tsx`
- `components/media/MediaEmptyState.tsx`
- `components/media/MediaSourcePolicyNote.tsx`
- `components/media/MediaAudioCard.tsx`
- `components/media/MediaVideoCard.tsx`
- `components/studio/audio/StudioAudioWorkspace.tsx`
- `components/studio/films/FilmAdaptationForm.tsx`
- `docs/MEDIA_READER_FIRST_COPY_CLEANUP_REPORT.md`

## Remaining TODO

1. Add `MediaSourcePolicyNote` to **Admin** film/audio policy pages if a dedicated admin copy block is needed.
2. Advanced taxonomy filters (Cảm giác, Bối cảnh, Format) — optional future chips; only **Thể loại** slug field exists today.
3. Sort “Nghe nhiều” / “Được lưu nhiều” still use proxy DB ordering until dedicated listen/save metrics exist on media items.
