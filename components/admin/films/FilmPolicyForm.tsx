import { updateFilmPolicyAction } from "@/app/admin/film-adaptations/actions";
import type { FilmAdaptationPolicySettings } from "@/lib/settings/film-adaptation-settings";

type FilmPolicyFormProps = {
  settings: FilmAdaptationPolicySettings;
};

const BOOL_FIELDS: Array<keyof FilmAdaptationPolicySettings> = [
  "film_adaptations_enabled",
  "film_adaptations_youtube_only",
  "require_linked_story",
  "allow_story_level_only",
  "allow_chapter_level_linking",
  "allow_youtube_video",
  "allow_youtube_playlist",
  "film_must_be_free",
  "paid_film_enabled",
  "coin_unlock_film_enabled",
  "film_tips_enabled",
  "film_ads_enabled",
  "auto_publish_for_trusted_creators",
  "require_rights_declaration",
  "show_in_discover_tab",
  "show_on_story_detail",
  "show_creative_disclaimer",
  "original_story_film_ads_allowed",
  "translated_story_film_ads_requires_verified_rights",
  "translated_story_film_ads_allowed_when_unverified",
  "youtube_embed_ads_on_film_pages_enabled",
  "require_admin_review_for_youtube",
  "broken_youtube_check_enabled",
  "hide_unavailable_films_automatically"
];

export function FilmPolicyForm({ settings }: FilmPolicyFormProps) {
  return (
    <form
      action={updateFilmPolicyAction}
      className="space-y-5 rounded-xl border border-white/10 bg-white/[0.02] p-4"
    >
      <div className="space-y-2 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
        <p>MVP chỉ YouTube embed — không tải lên, rehost hay proxy.</p>
        <p>
          <code>allow_chapter_level_linking</code> nên giữ false trừ khi đổi chiến lược sản phẩm.
        </p>
        <p>
          <code>paid_film_enabled</code> và <code>coin_unlock_film_enabled</code> là cờ tương lai
          (mặc định false; server ép false khi lưu).
        </p>
        <p>Phim dịch chưa xác minh quyền: tắt quảng cáo theo mặc định policy.</p>
        <p>Không biến ChapMee thành trang tổng hợp YouTube thuần.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {BOOL_FIELDS.map((key) => (
          <label
            className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm"
            key={key}
          >
            <span className="text-zinc-200">{key}</span>
            <select
              className="rounded border border-white/20 bg-black/40 px-2 py-1 text-sm"
              defaultValue={String(Boolean(settings[key]))}
              name={key}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-zinc-300">default_film_status</span>
          <select
            className="w-full rounded border border-white/20 bg-black/40 px-2 py-2"
            defaultValue={settings.default_film_status}
            name="default_film_status"
          >
            <option value="draft">draft</option>
            <option value="pending_review">pending_review</option>
            <option value="published">published</option>
            <option value="hidden">hidden</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-zinc-300">max_films_per_story</span>
          <input
            className="w-full rounded border border-white/20 bg-black/40 px-2 py-2"
            defaultValue={settings.max_films_per_story}
            name="max_films_per_story"
            type="number"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-zinc-300">broken_youtube_check_interval_hours</span>
          <input
            className="w-full rounded border border-white/20 bg-black/40 px-2 py-2"
            defaultValue={settings.broken_youtube_check_interval_hours}
            name="broken_youtube_check_interval_hours"
            type="number"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-zinc-300">discover_tab_label</span>
          <input
            className="w-full rounded border border-white/20 bg-black/40 px-2 py-2"
            defaultValue={settings.discover_tab_label}
            name="discover_tab_label"
            type="text"
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-zinc-300">creative_disclaimer_text</span>
          <textarea
            className="min-h-[88px] w-full rounded border border-white/20 bg-black/40 px-2 py-2"
            defaultValue={settings.creative_disclaimer_text}
            name="creative_disclaimer_text"
          />
        </label>
      </div>
      <button
        className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-cyan-200"
        type="submit"
      >
        Lưu policy
      </button>
    </form>
  );
}
