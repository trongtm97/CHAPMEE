# ChapMee A/B Testing MVP

MVP nay tap trung vao 3 viec:

- dinh nghia experiment tap trung
- assignment variant on dinh cho user/anonymous
- track exposure va conversion event qua analytics hien co

## 1) Tao experiment moi

Them vao `lib/experiments/experiments.ts`:

- `experiment_key`: key duy nhat
- `description`: mo ta ngan
- `status`: `draft | active | paused | ended`
- `variants`: danh sach variant va payload
- `traffic_allocation`: ty le traffic theo thu tu variants
- `default_variant`: variant fallback khi inactive/invalid
- `start_date` va `end_date` (optional)

Luu y:

- Tong `traffic_allocation` khong can dung 100, he thong tu normalize.
- Neu traffic config loi, he thong fallback chia deu.
- Experiment inactive se tra `default_variant`.

## 2) Dung hook useExperiment

```tsx
const exp = useExperiment("landing_hero_copy");
const title =
  typeof exp.payload.hero_title === "string"
    ? exp.payload.hero_title
    : "Lướt truyện cuốn như TikTok";
```

Hook tra ve:

- `variant`
- `payload`
- `isDefault`
- `trackExposure()`

Mac dinh hook auto track exposure 1 lan khi mounted.

## 3) Track conversion

Dung helper:

```ts
trackExperimentConversion({
  experimentKey: "swipe_cta_copy",
  variant: exp.variant,
  conversionName: "swipe_read_more_clicked",
  properties: { story_id: "...", episode_id: "..." }
});
```

Events duoc track:

- `experiment_exposed`
- `experiment_converted`

Metadata gom:

- `experiment_key`
- `variant`
- `page_path`
- `conversion_event` (voi conversion)

User id va anonymous id duoc analytics client layer tu them.

## 4) Quy tac van hanh MVP

- Khong test qua nhieu thu cung luc trong 1 man hinh.
- Moi experiment nen co 1 metric conversion chinh.
- Khong thay doi UI qua lon trong cung mot variant test copy.
- Pause/ended experiment truoc khi xoa code.
- Chot winner roi rollout thanh default, sau do xoa experiment da xong.
