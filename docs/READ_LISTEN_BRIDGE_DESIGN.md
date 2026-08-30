# ChapMee Read ↔ Listen Bridge (Story-level only)

Mục tiêu: tạo tương quan chặt giữa **đọc truyện (text/story)** và **nghe truyện (audio companion)**, nhưng **chỉ ở cấp truyện (`story_id`)**.

Giới hạn/không mục tiêu:
- Không triển khai runtime refactor lớn trong prompt này (docs-only).
- Không tạo nội dung audio độc lập tách khỏi truyện.
- Không “Nghe chương này”.
- Không “Đọc chương” trong UI audio.
- Mobile bottom nav giữ nguyên 4 tab (Reels/Discover/Community/Me).
- Không autoplay.
- YouTube chỉ nghe bằng iframe chính thức; không nghe nền/không đưa YouTube vào Global Audio Player.

## 1) Current UI audit (hiện trạng trong codebase)

### 1.1 Story detail page (`/stories/[slug]`)
**Điểm có audio (story-level)**
- `components/story/StoryHero.tsx`
  - Hiển thị badge **“Có audio”** nếu `hasPublishedAudio`.
- `components/story/StoryDetailPage.tsx`
  - Thêm tab `Audio` vào `StoryTabs` **chỉ khi** `publishedAudioItems.length > 0`.
- `src/components/audio/StoryAudioSection.tsx`
  - Có section `#audio`, badge **“Có audio”**.
  - Buttons:
    - **“Nghe truyện”**: `playQueue(queue)` (chạy theo queue).
    - **“Nghe từ đầu”**: `playQueue(queue)` (khác biệt về “start position” chưa được tách rõ, vì vẫn gọi cùng `playQueue(queue)`).
    - **“Nghe tiếp”**: chỉ render nếu `continueAudioItemId` được truyền vào và tồn tại item “continue” trong `queue`.
  - Mỗi part render bằng `src/components/audio/AudioItemCard.tsx` (compact):
    - Source badge: **Audio ngoài** hoặc **YouTube**.
    - Free badge: **“Miễn phí”** (đang hardcode theo UI, không bám theo `is_free` field ở component này).
    - Có “Nghe” cho **queueItem tồn tại** (tức item nằm trong queue mà Global Player có thể phát).
    - Links back về truyện text:
      - **“Đọc truyện”** và/hoặc **“Mở truyện”** (tuỳ nhánh).

**Ghi chú audit quan trọng**
1) CTAs “Nghe truyện/Nghe từ đầu/Nghe tiếp” đang nằm trong tab `Audio`, không xuất hiện trực tiếp ngay ở phần header mặc định (trang mở mặc định tab `chapters`).
2) Queue của Global Player hiện **lọc theo continuous playback** cho external audio (xem `src/lib/audio/audio-queue.ts`). Hệ quả:
   - Với external audio parts **không continuous**, `queueItem` có thể không tồn tại ⇒ part đó chỉ còn CTA kiểu **“Mở truyện”** (không có CTA “Nghe”).
3) `continueAudioItemId` lấy từ progress theo `audio_item_id` (`src/lib/audio/public-audio.ts`), nhưng progress đó có thể không thuộc queue hiện tại (do queue bị lọc continuous) ⇒ “Nghe tiếp” có thể:
   - hoặc không hiển thị trong một số nơi,
   - hoặc hiển thị nhưng bắt đầu từ phần đầu (tuỳ component gọi `playQueue` và cách queue chứa item).

### 1.2 Chapter reader page (`/stories/[slug]/episodes/[episodeNumber]`)
`components/reader/ReaderPage.tsx` chèn `components/reader/StoryAudioCTABox.tsx`.
- `components/reader/StoryAudioCTABox.tsx`
  - Nếu `queue.length === 0` ⇒ `return null`
  - Hiển thị hộp CTA nhẹ:
    - Title: **“Truyện này có bản audio”**
    - Subtitle: **“Bạn có thể nghe bản audio của truyện này.”**
    - Buttons:
      - **“Nghe truyện”**: `playQueue(queue)`
      - **“Nghe tiếp”**: chỉ render nếu `continueAudioItemId` truthy, gọi `playQueue(queue, continueAudioItemId)`
      - Link: **“Xem danh sách audio”**: `${storyHref}#audio`
  - Không có “Nghe chương này”.
  - Không hiển thị player theo chương.

**Ghi chú audit quan trọng**
- Admin policy `show_story_audio_cta_on_chapter_reader` tồn tại trong `src/lib/audio/audio-policy.ts` nhưng hiện **không được sử dụng để gate CTA** ở `ReaderPage`/`StoryAudioCTABox`. Reader chỉ gate theo `queue.length`.

### 1.3 `/audio` page (audio landing list)
- `app/audio/page.tsx`
  - `generateMetadata()` có canonical và mô tả “Audio Truyện”.
  - Lọc danh sách theo `origin/source/continuous/sort`.
  - Với mỗi item, render `src/components/audio/AudioItemCard.tsx`.

**Ghi chú audit quan trọng**
- `AudioItemCard.tsx` không đảm bảo CTA theo yêu cầu cầu “Nghe/Đọc truyện/Mở truyện” cho mọi loại part:
  - YouTube embed: `YoutubeEmbedPlayer` chỉ có link **“Đọc truyện”**, không có CTA “Nghe” trong UI card.
  - External audio parts: “Nghe” chỉ hiển thị nếu `queueItem` tồn tại (queue hiện do `buildStoryAudioQueue` tạo ra).

### 1.4 Audio components
#### `src/components/audio/StoryAudioSection.tsx`
- Badge “Có audio”.
- Buttons “Nghe truyện/Nghe từ đầu/Nghe tiếp”.
- Part ordering và hiển thị part:
  - hiển thị `item.part_number` nếu có,
  - nếu không có thì hiển thị theo `sort_order`.

#### `src/components/audio/AudioItemCard.tsx`
- Source badge + “Miễn phí”.
- Nếu có `queueItem` ⇒ render nút **“Nghe”** (play global player) + links “Đọc truyện/Mở truyện”.
- Nếu không có `queueItem`:
  - YouTube embed (có videoId) ⇒ render iframe + link “Đọc truyện” (không “Nghe”, không “Mở truyện” ở UI card).
  - Các trường hợp khác ⇒ chỉ còn link **“Mở truyện”**.

#### `src/components/audio/YoutubeEmbedPlayer.tsx`
- iframe YouTube embed.
- Có text note “không nghe nền qua ChapMee player”.
- Có link **“Đọc truyện”**.

### 1.5 Global Audio Player (Global Media Coordinator)
**Coordinator logic hiện tại**
- `src/components/audio/GlobalAudioProvider.tsx`
  - Là state machine/điều phối phát:
    - `playAudioItem()` / `playQueue()`
    - continuous mode (`state.isContinuousMode`)
    - sleep timer
    - progress save (`saveAudioProgressAction` + localStorage fallback cho guest)
  - Global audio phát dựa trên **một `<audio>` element** duy nhất (hạn chế “chỉ một media phát tại một thời điểm” đúng mục tiêu).
  - On `ended`:
    - nếu sleep timer `end_of_part` ⇒ pause
    - nếu continuous mode và còn phần kế tiếp trong queue ⇒ tự phát tiếp
    - else stop

#### `src/components/audio/GlobalAudioMiniPlayer.tsx`
- Luôn overlay khi có `state.currentAudioItem`.
- Hiển thị:
  - story title
  - audio title + part number (nếu có)
  - progress bar + time
  - nút pause/resume + next + stop
  - Link “Đọc truyện” và action mở full player.

**Ghi chú audit quan trọng**
- Link hiện tại dùng `href={`/stories/${item.storyId}`}`.
  - `item.storyId` đến từ `audio_queue` là `stories.id` (UUID) ⇒ có rủi ro mismatch với route `/stories/[slug]` (slug/canonical/public_code).

#### `src/components/audio/GlobalAudioFullPlayer.tsx`
- Full-screen modal overlay khi `state.isFullPlayerOpen`.
- Hiển thị:
  - Đang nghe: audio title + part number, story title
  - Queue list (các phần trong `state.queue`)
  - “Phần trước/Phần tiếp”
  - Toggle “Nghe liên tục”
  - Links “Đọc truyện” và “Mở truyện”

**Ghi chú audit quan trọng**
- Cũng dùng `href={`/stories/${item.storyId}`}` ⇒ rủi ro link sai như mini player.

### 1.6 Discover/Search/Profile story cards
- `components/discover/DiscoverStoryCard.tsx`, `components/discover/MobileStoryCard.tsx`
  - Chỉ hiển thị nội dung/nguồn/origin/metadata khác.
  - Không render badge “Có audio”.
- `components/search/SearchPageView.tsx`
  - Render card kiểu generic (`SearchClickLink`) ⇒ không có badge “Có audio”.
- `components/profile/ProfileStoryCard.tsx`
  - Chỉ hiển thị genre/status/like/update; không có badge “Có audio”.
- `/me`:
  - `components/me/DesktopMePage.tsx`, `components/me/MobileMePage.tsx` không có UI audio companion riêng.

**Ghi chú audit quan trọng**
- Policy settings có `show_audio_badge_on_story_cards`, nhưng UI story cards hiện không dùng field badge từ policy/capabilities (chưa có “bridge badge” ở entry points Discover/Search/Profile).

### 1.7 Admin audio policy settings
- `app/admin/audio/policy/page.tsx`
  - Có text “Story-level only policy. Không có option chapter-level audio…”.
- `src/components/admin/audio/AudioPolicyForm.tsx`
  - Có nhiều flag, bao gồm:
    - `show_audio_badge_on_story_cards`
    - `show_story_audio_cta_on_chapter_reader`
    - `show_continue_listening`, `show_continuous_playback_badge`,…

**Ghi chú audit quan trọng**
- Một số flag ở policy tồn tại nhưng UI đọc/chặn hiện tại chưa đồng bộ (đặc biệt CTA ở chapter reader, badge ở story cards).

---

## 2) Proposed reader → audio entry points (story-level only)

### 2.1 Story detail page (`/stories/[slug]`)
Nếu truyện có audio published:
1) Badge “Có audio” giữ như hiện tại (`StoryHero`).
2) **CTA nổi bật ở vùng đầu trang hoặc gần header/đầu nội dung**, không chỉ nằm trong tab:
   - “Nghe truyện”
   - “Nghe từ đầu”
   - “Nghe tiếp” nếu có progress (và progress map được tới một part khả dụng)
3) Section/Tab “Audio”:
   - Giữ anchor `#audio`.
   - Audio section hiển thị danh sách audio parts theo part number / sort_order.

Ràng buộc UI:
- Không có CTA “Đọc chương”.
- Không có CTA “Nghe chương này”.

### 2.2 Chapter reader (`/stories/[slug]/episodes/[episodeNumber]`)
Nếu truyện có audio published:
- CTA nhẹ như `StoryAudioCTABox` hiện tại, nhưng đề xuất thêm gate theo admin policy:
  - chỉ hiển thị nếu `canShowStoryAudioCTAOnChapterReader(story, settings)` đúng flag
- “Nghe tiếp”:
  - chỉ hiển thị khi `continueAudioItemId` map được sang một part sẽ thực sự được phát trong trải nghiệm audio của story (không phụ thuộc việc part có nằm trong “queue lọc continuous” nếu queue lọc đó làm CTA sai).

Ràng buộc UI:
- CTA phải điều hướng/trigger audio của **truyện**, không trigger audio của chương.
- Không render player theo chương.

---

## 3) Proposed audio → reader entry points

Mục tiêu: khi người dùng đang nghe audio, họ phải thấy đường quay lại text/story rõ ràng.

### 3.1 Global Audio Mini Player
- Hiển thị:
  - story title
  - audio title
  - part number (nếu có)
  - CTA “Đọc truyện” (link tới story text)
  - CTA mở full player
- Trạng thái cần có phần nhận diện “đang nghe part nào của story nào” (đã có trong mini player: storyTitle + `Phần X: title`).

### 3.2 Global Audio Full Player
- Hiển thị:
  - “Đang nghe”: audio title + part number
  - “Thuộc truyện”: story title
  - Queue list các audio parts của cùng story
  - “Phần trước/Phần sau”
  - Toggle “Nghe liên tục”
  - Link “Đọc truyện” và “Mở truyện”
- Không có chapterTitle/chapterId.
- Không có “Đọc chương”.

### 3.3 Audio item cards / YouTube embed
- Mỗi audio part card đều có tối thiểu link back:
  - “Đọc truyện” hoặc “Mở truyện” (đề xuất chuẩn hoá 1 nơi là primary, nơi còn lại là secondary)
- YouTube embed:
  - “Nghe” nên là CTA thể hiện “phát trong iframe card” (không đưa vào Global Audio Player).

---

## 4) Mobile design

### 4.1 Bottom nav
- Giữ 4 tab (Reels, Discover, Community, Me).
- Global audio mini player:
  - overlay nhưng không che UI quan trọng
  - nằm trên bottom nav (hiện trạng đang dùng `bottom-[calc(4.5rem+env(safe-area-inset-bottom))]`).

### 4.2 Chuyển đổi tự nhiên Read → Listen
- Khi đang ở story detail:
  - CTA nổi bật “Nghe truyện” mở phát queue của story.
- Khi đang ở chapter reader:
  - CTA nhẹ “Truyện này có bản audio” + “Nghe tiếp” (nếu map progress hợp lệ).

### 4.3 Chuyển đổi tự nhiên Listen → Read
- Tap “Đọc truyện” từ mini/full player mở story text.
- Full player queue list giúp người dùng biết đang ở phần nào của story nào.

---

## 5) Desktop design

### 5.1 Story detail
- Bố cục như hiện tại với tab `Audio`.
- Đề xuất thêm CTAs nổi bật gần đầu trang để đúng “reader → audio” entry point (không chỉ nằm trong tab).

### 5.2 Global full player
- Modal full-screen hoặc centered sheet (tuỳ style hệ thống), nhưng vẫn:
  - có story title + audio title + part number
  - có queue list
  - có “Đọc truyện/Mở truyện”

---

## 6) Story detail design (theo yêu cầu A)

Khi truyện có audio published:
1) Hiển thị badge “Có audio”.
2) Hiển thị CTA:
   - “Nghe truyện”
   - “Nghe từ đầu”
   - “Nghe tiếp” nếu có progress
3) Có section/tab “Audio”.
4) Audio section:
   - hiển thị audio parts theo `part_number/sort_order` (part number ưu tiên nếu có).
5) Mỗi audio part:
   - `title`
   - hiển thị part number nếu có
   - source badge: Audio ngoài / YouTube
   - free badge
   - CTA “Nghe”
   - CTA “Đọc truyện” hoặc “Mở truyện”

Ràng buộc:
- Không có CTA “Đọc chương”.

---

## 7) Chapter reader CTA design (theo yêu cầu B)

Nếu truyện có audio published:
- CTA nhỏ:
  - Title: “Truyện này có bản audio”
  - Subtitle: “Bạn có thể nghe bản audio của truyện này.”
  - Buttons:
    - “Nghe truyện”
    - “Nghe tiếp” nếu có progress hợp lệ
    - “Xem danh sách audio”
- Không có “Nghe chương này”.
- Không có player theo chương.

Đề xuất chuẩn hoá logic hiển thị:
- “Nghe tiếp” phải tương ứng với part có thể được phát trong trải nghiệm audio hiện tại (đừng chỉ dựa vào `continueAudioItemId` truthy nếu queue đang bị lọc).

---

## 8) `/audio` page design (theo yêu cầu E)

Mỗi audio card (đều ở cấp story-level):
- audio title
- story title
- part number (nếu có)
- creator/author link sang `/@username`
- source badge
- free badge
- CTA:
  - “Nghe”
  - “Đọc truyện”
  - “Mở truyện”

Ràng buộc:
- Không có “Đọc chương”.
- Không tạo audio-only route dạng `/audio/[id]` tách khỏi story.
- Không có audio card nào thiếu story link.

---

## 9) Global player design (theo yêu cầu C/D)

### 9.1 Global Audio Mini Player (theo yêu cầu C)
- Luôn hiển thị khi có phiên nghe đang active:
  - story title
  - audio title + part number
  - CTA “Đọc truyện”
  - CTA mở full player

### 9.2 Global Audio Full Player (theo yêu cầu D)
- Hiển thị:
  - Đang nghe: audio title / part number
  - Thuộc truyện: story title
  - Link “Đọc truyện”
  - Link “Mở truyện”
  - Queue list audio parts
  - “Phần trước/Phần sau”
  - Toggle “Nghe liên tục”
- Không có “Đọc chương này”.
- Không có chapterTitle/chapterId.

---

## 10) Empty/missing audio states

Các trạng thái cần có hành vi rõ ràng, tránh “nút Nghe biến mất” một cách khó hiểu:
1) Story không có audio published:
   - không render tab/section audio
   - không render CTA “Nghe…”
2) Story có audio, nhưng một part thiếu dữ liệu playback:
   - YouTube thiếu `youtube_video_id` ⇒ disable “Nghe” và chỉ giữ link “Đọc truyện”.
   - External thiếu URL hợp lệ ⇒ disable “Nghe” và chỉ giữ link “Đọc truyện/Mở truyện”.
3) Continue listening:
   - Nếu `continueAudioItemId` không map được sang part “có thể phát” trong trải nghiệm audio:
     - không hiển thị “Nghe tiếp”
     - hoặc hiển thị “Nghe từ đầu” thay thế (tuỳ UX).
4) Queue trong global player:
   - Queue list phải phản ánh đúng những part sẽ được điều hướng theo continuous.
   - Không nên để UI “Nghe” phụ thuộc queue lọc continuous nếu mục tiêu UX yêu cầu “mỗi part đều có CTA Nghe”.

---

## 11) Story-level audio parts design

### 11.1 Source types
- `external_audio_url` (play bằng Global Audio Player `<audio>`)
- `youtube_embed` (play bằng iframe; không vào Global Audio Player)

### 11.2 Ordering
- Sort theo:
  1) `part_number` (null sau)
  2) `sort_order`
  3) fallback theo `created_at` nếu cần ổn định

### 11.3 Part identity for progress
- Progress lưu theo `(profile_id, story_id, audio_item_id)`.
- Khi build CTA “Nghe tiếp”, cần đảm bảo `continueAudioItemId` map đúng part đang được render.

---

## 12) Global Media Coordinator interaction

Trong code hiện tại:
- `src/components/audio/GlobalAudioProvider.tsx` là “Global Media Coordinator”:
  - đảm bảo chỉ một `<audio>` chạy tại một thời điểm
  - quản lý:
    - `playAudioItem`
    - `playQueue` + `startAudioItemId`
    - continuous mode: auto-next trong queue
    - sleep timer: pause/pause-at-end-of-part
    - save progress theo chu kỳ và khi rời trang/ẩn tab

Tác động tới bridge UI:
- “Nghe” từ UI cần truyền đúng queue và `startAudioItemId` để người dùng biết đang nghe phần nào.
- Khi người dùng chuyển sang text:
  - trạng thái player vẫn tiếp tục theo chính sách (background/continuous) và không mở audio-only page.

---

## 13) SEO / Accessibility notes

### 13.1 Headings & landmarks
- Tuân theo `SEO_HEADING_STANDARD.md`:
  - `/stories/[slug]` phải có đúng 1 `h1` là story title.
  - phần lặp lại dùng `h2/h3` thay vì `h1`.
- Story audio section nên giữ:
  - `h2` cho heading “Audio”
  - `id="audio"` để deep-link từ chapter reader.

### 13.2 `/audio` page metadata
- `/audio`:
  - `generateMetadata()` hiện đã có title/description/canonical.
  - Cần đảm bảo không tạo “audio-only detail” tách khỏi story text.

### 13.3 Modal / player accessibility
- Global full player là modal overlay:
  - phải có heading semantic (hiện dùng `h2`).
  - nút đóng có nhãn rõ ràng (hiện có “Đóng”).
  - links quay lại text phải là anchor/link (không thay thế bằng click handlers).

### 13.4 Anchor links
- CTA “Xem danh sách audio” dùng `#audio`.
- Đề xuất:
  - Khi mở story từ global player, có thể đưa user đến section audio (tuỳ UX) nhưng cần không gây “audio-first” cảm giác audio độc lập.

---

## 14) Validation checklist (đạt theo acceptance criteria)

### 14.1 Bridging rules (UI)
1) Story detail:
   - Nếu có audio published ⇒ hiển thị badge “Có audio” + CTA “Nghe truyện/Nghe từ đầu/Nghe tiếp (nếu có progress)”.
   - Có section/tab “Audio”.
   - Không có CTA “Đọc chương”.
2) Chapter reader:
   - CTA nhẹ chỉ cho audio của truyện, không nói “nghe chương”.
   - Không hiển thị audio player theo chương.
3) Audio UI:
   - Global mini/full player và audio cards luôn có CTA quay về story text (“Đọc truyện”/“Mở truyện”).
   - Không có “Đọc chương” và không có “Nghe chương này”.
4) Audio-only route:
   - Không tạo `/audio/[id]` hoặc route audio-only mà thiếu story link.

### 14.2 Policy validation (Admin control)
1) Admin flag `story_level_audio_only`:
   - phải ngăn chapter_id trong policy ở backend (đang có `assertStoryLevelAudioOnly`).
2) Admin flag `show_story_audio_cta_on_chapter_reader`:
   - UI chapter reader CTA phải gate theo flag này.
3) Admin flag `show_audio_badge_on_story_cards`:
   - story cards ở Discover/Search/Profile phải render badge dựa trên capability/badges.

### 14.3 Queue / progress correctness
1) “Nghe tiếp”:
   - Chỉ hiển thị khi `continueAudioItemId` map được tới một part sẽ thực sự được phát theo trải nghiệm “Nghe” được người dùng nhấn.
2) “Đang nghe phần nào”:
   - mini/full player hiển thị đúng `part number` + `audio title`.
3) Continuous mode:
   - “Nghe liên tục” chỉ điều phối next trong phạm vi parts hợp lệ theo source type/policy.

### 14.4 SEO & accessibility
1) Headings:
   - đảm bảo mỗi trang có đúng `h1` theo `SEO_HEADING_STANDARD.md`.
   - audio section dùng `h2/h3`, không spam heading.
2) Modal full player:
   - nút đóng và heading ngữ nghĩa.
3) Deep links:
   - `#audio` hoạt động đúng.

