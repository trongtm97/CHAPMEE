"use client";

import { buildYoutubeEmbedUrl } from "@/src/lib/audio/audio-url";

type YoutubeAudioFormProps = {
  url: string;
  videoId: string | null;
  onUrlChange: (value: string) => void;
  onValidate?: () => void;
  validationMessage?: string | null;
  validationOk?: boolean | null;
};

export function YoutubeAudioForm({
  url,
  videoId,
  onUrlChange,
  onValidate,
  validationMessage,
  validationOk
}: YoutubeAudioFormProps) {
  const embedUrl = videoId ? buildYoutubeEmbedUrl(videoId) : null;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-200">
        Link YouTube
        <input
          type="url"
          name="youtube_url"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
          required
        />
      </label>
      {videoId ? <input type="hidden" name="youtube_video_id" value={videoId} /> : null}
      {onValidate ? (
        <button
          type="button"
          onClick={onValidate}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
        >
          Kiểm tra link YouTube
        </button>
      ) : null}
      {validationMessage ? (
        <p className={`text-xs ${validationOk ? "text-emerald-300" : "text-rose-300"}`}>
          {validationMessage}
        </p>
      ) : null}
      <p className="text-xs text-amber-200">
        YouTube chỉ phát bằng iframe chính thức trên trang truyện. Không dùng Global Audio Player,
        không nghe nền bằng ChapMee.
      </p>
      {embedUrl ? (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
          <iframe
            src={embedUrl}
            title="YouTube preview"
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}
    </div>
  );
}
